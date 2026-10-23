#!/usr/bin/env python3
"""Smoke-test the real Posh desktop app through the accessibility bus.

The unit tests cover the arithmetic. This covers the whole chain in the
shipped binary: webview -> Tauri IPC -> Rust -> SQLite -> drizzle -> UI.

The app is driven the way a screen reader would drive it, so the assertions
are about what a cashier would actually see: the window title, the sidebar,
the products loaded from the database, the totals shown on screen, the change
due on a cash sale and the confirmation that follows it.

The check is non-destructive. It adds one product to the cart, asserts the
totals, then pays for the sale with a cash note and reads the sale back out
of the database. The database is snapshotted before the sale and restored
afterwards, so the run leaves it exactly as it found it. If the app has not
been set up yet, the check chooses the main till with the default name/code
first.

Usage:
    python3 scripts/real-app-smoke.py                      # launch the release build
    python3 scripts/real-app-smoke.py --binary path/to/desktop
    python3 scripts/real-app-smoke.py --pid 12345          # attach to a running app
    python3 scripts/real-app-smoke.py --no-sale            # skip the cash sale
    python3 scripts/real-app-smoke.py --db path/to/posh.db # database to read

Needs an X or Wayland session with the AT-SPI accessibility bus running
(at-spi2-core). On GNOME, install `at-spi2-core` and log in over a real
session rather than a nested one.
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import gi

gi.require_version("Atspi", "2.0")
from gi.repository import Atspi  # noqa: E402

WINDOW_TITLE = "Posh — Point of Sale"
SIDEBAR_LINKS = ("Terminal", "Products", "Orders", "Settings")

# Tauri puts the app data in `<data dir>/<identifier>` on Linux.
APP_DIR_NAME = "app.poshq"
DB_FILE_NAME = "posh.db"


# --- accessibility helpers -------------------------------------------------


class App:
    """A thin wrapper over the accessibility tree of the running app."""

    def __init__(self, pid: int) -> None:
        self.pid = pid

    @classmethod
    def find(cls, pid: int, timeout: float = 20.0) -> "App":
        Atspi.init()
        deadline = time.time() + timeout
        while time.time() < deadline:
            desktop = Atspi.get_desktop(0)
            for index in range(desktop.get_child_count()):
                candidate = desktop.get_child_at_index(index)
                if candidate is not None and candidate.get_process_id() == pid:
                    return cls(pid)
            time.sleep(0.25)
        raise TimeoutError(f"no accessible application registered for pid {pid}")

    def _walk(self, node, depth: int = 0):
        yield node, depth
        try:
            count = node.get_child_count()
        except Exception:
            return
        for index in range(count):
            try:
                child = node.get_child_at_index(index)
            except Exception:
                continue
            if child is not None:
                yield from self._walk(child, depth + 1)

    def nodes(self):
        desktop = Atspi.get_desktop(0)
        for index in range(desktop.get_child_count()):
            app = desktop.get_child_at_index(index)
            if app is None or app.get_process_id() != self.pid:
                continue
            yield from self._walk(app)

    @staticmethod
    def text_of(node) -> str:
        try:
            count = Atspi.Text.get_character_count(node)
        except Exception:
            return ""
        if not count:
            return ""
        try:
            return Atspi.Text.get_text(node, 0, count)
        except Exception:
            return ""

    def name_of(self, node) -> str:
        try:
            return node.get_name() or ""
        except Exception:
            return ""

    def find_by_name(self, needle: str, role: str | None = None):
        matches = []
        for node, _ in self.nodes():
            if role is not None and node.get_role_name() != role:
                continue
            if needle in self.name_of(node):
                matches.append(node)
        return matches

    def click(self, node) -> bool:
        if Atspi.Action.get_n_actions(node) == 0:
            raise RuntimeError("node has no actions")
        return bool(Atspi.Action.do_action(node, 0))

    def body_text(self) -> str:
        """The rendered page text.

        WebKit exposes the document's text on its wrapper section rather than
        on the document node itself, so the longest section text wins.
        """
        best = ""
        for node, _ in self.nodes():
            if node.get_role_name() not in ("document web", "section"):
                continue
            text = self.text_of(node)
            if len(text) > len(best):
                best = text
        return best

    def has_text(self, needle: str) -> bool:
        """Whether any node carries `needle` in its name or its text.

        Toasts live in their own section, which `body_text` ignores, so this
        searches every node instead.
        """
        target = flat(needle)
        for node, _ in self.nodes():
            if target in flat(self.name_of(node)):
                return True
            if target in flat(self.text_of(node)):
                return True
        return False

    def wait_for_ui(self, timeout: float = 20.0) -> bool:
        """Wait for the webview to paint.

        The app registers on the accessibility bus before its webview has
        rendered anything, so the first tree is an empty frame.
        """
        deadline = time.time() + timeout
        while time.time() < deadline:
            if self.body_text().strip():
                return True
            time.sleep(0.3)
        return False

    def label_values(self) -> dict:
        """Read the cart summary as a {label: value} mapping."""
        terms, values = [], []
        for node, _ in self.nodes():
            role = node.get_role_name()
            if role == "description term":
                terms.append(self.text_of(node).strip())
            elif role == "description value":
                values.append(self.text_of(node).strip())
        return dict(zip(terms, values))

    def button(self, matches):
        """The first button whose accessible name satisfies `matches`."""
        for node, _ in self.nodes():
            if node.get_role_name() != "button":
                continue
            if matches(app_name := self.name_of(node).strip()):
                return node, app_name
        return None, ""

    def type_into(self, name: str, text: str) -> bool:
        """Type into a labelled text field."""
        for node, _ in self.nodes():
            if node.get_role_name() not in ("text", "entry", "editable"):
                continue
            if self.name_of(node).strip() != name:
                continue
            try:
                Atspi.EditableText.set_text_contents(node, text)
            except Exception:
                return False
            return True
        return False


# --- money ------------------------------------------------------------------

MONEY = re.compile(r"USh\s*([\d.,]+)")


def to_int(text: str) -> int:
    """Read a shillings amount out of a label.

    Amounts are written as ``USh 1,500``. The amount is taken from the last
    match so that a name containing digits — "Soda 500ml" — cannot be mistaken
    for part of the price.
    """
    matches = MONEY.findall(text or "")
    if matches:
        digits = re.sub(r"[^0-9]", "", matches[-1])
        return int(digits) if digits else 0
    digits = re.sub(r"[^0-9]", "", text or "")
    return int(digits) if digits else 0


def format_ugx(amount: int) -> str:
    """The amount the way the app writes it: ``USh 2,000``.

    ICU separates the currency from the amount with a no-break space, so the
    separator is spelled out here rather than typed as a plain space.
    """
    return f"USh\u00a0{amount:,}"


def flat(text: str) -> str:
    """Collapse every run of whitespace so text split across nodes still matches."""
    return re.sub(r"\s+", " ", text or "")


def till_total(text: str) -> int | None:
    """The cash in the drawer, as shown in the terminal header."""
    match = re.search(r"Till\s+[A-Za-z0-9]{1,4}\s*USh\s*([\d,]+)", text or "")
    if not match:
        return None
    return int(match.group(1).replace(",", ""))


# --- database ---------------------------------------------------------------


def resolve_db_path(explicit: str | None) -> Path | None:
    """Find the database the app writes to."""
    if explicit:
        path = Path(explicit).expanduser()
        return path if path.exists() else None
    base = os.environ.get("XDG_DATA_HOME") or str(Path.home() / ".local" / "share")
    path = Path(base) / APP_DIR_NAME / DB_FILE_NAME
    return path if path.exists() else None


def snapshot_database(path: Path) -> Path:
    """Copy the live database into a consistent snapshot we can put back."""
    handle, name = tempfile.mkstemp(prefix="posh-smoke-", suffix=".db")
    os.close(handle)
    snapshot = Path(name)
    source = sqlite3.connect(path)
    target = sqlite3.connect(snapshot)
    try:
        source.backup(target)
    finally:
        target.close()
        source.close()
    return snapshot


def restore_database(snapshot: Path, path: Path) -> None:
    """Put the snapshot back over the live database."""
    for suffix in ("-wal", "-shm"):
        sidecar = path.with_name(path.name + suffix)
        if sidecar.exists():
            sidecar.unlink()
    shutil.copyfile(snapshot, path)


def read_orders(path: Path) -> dict[str, sqlite3.Row]:
    """Every order in the database, keyed by id."""
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    try:
        rows = connection.execute(
            "SELECT id, order_no, status, subtotal, tax_rate, tax, total,"
            " payment_method, tendered, change_given, created_at"
            " FROM orders"
        ).fetchall()
    finally:
        connection.close()
    return {row["id"]: row for row in rows}


def delete_order(path: Path, order_id: str) -> None:
    """Remove an order and its items — the smoke sale leaves no trace."""
    connection = sqlite3.connect(path)
    try:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("DELETE FROM orders WHERE id = ?", (order_id,))
        connection.commit()
    finally:
        connection.close()


# --- checks -----------------------------------------------------------------


class Report:
    def __init__(self) -> None:
        self.checks: list[tuple[bool, str, str]] = []

    def check(self, ok: bool, label: str, detail: str = "") -> bool:
        self.checks.append((bool(ok), label, detail))
        mark = "PASS" if ok else "FAIL"
        print(f"  [{mark}] {label}" + (f" — {detail}" if detail else ""))
        return bool(ok)

    def note(self, label: str, detail: str = "") -> None:
        print(f"  [note] {label}" + (f" — {detail}" if detail else ""))

    @property
    def ok(self) -> bool:
        return all(ok for ok, _, _ in self.checks)

    def summary(self) -> str:
        failed = [label for ok, label, _ in self.checks if not ok]
        if not failed:
            return f"{len(self.checks)} checks passed"
        return f"{len(failed)} of {len(self.checks)} checks failed: " + "; ".join(failed)


def wait_for_button(app: App, matches, timeout: float = 15.0):
    """Wait for a button to appear, re-reading the accessibility tree."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        node, label = app.button(matches)
        if node is not None:
            return node, label
        time.sleep(0.25)
        app = App.find(app.pid)
    return None, ""


def wait_for_register(app: App, timeout: float = 25.0) -> App:
    """Wait until the terminal shows a till code after setup or a reload."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        body = app.body_text()
        if re.search(r"Till\s+[A-Za-z0-9]{1,4}\b", body) and re.search(
            r"\d+\s+products?\s+shown", body
        ):
            return app
        time.sleep(0.3)
        app = App.find(app.pid)
    return app


def ensure_main_till(app: App, report: Report) -> App:
    """Finish first-run setup as the main till, if this is a fresh install."""
    body = flat(app.body_text()).lower()
    if "set up this computer" not in body:
        return app

    report.note("first run", "setting this install up as the main till")
    choose, label = wait_for_button(app, lambda name: "Choose main till" in name)
    if choose is None:
        report.check(False, "first-run setup", "<no main till choice>")
        return app
    app.click(choose)
    time.sleep(0.5)

    start, label = wait_for_button(app, lambda name: "Start selling here" in name)
    if start is None:
        report.check(False, "first-run setup", "<no start button>")
        return app
    app.click(start)

    return wait_for_register(app)


def quick_notes(app: App) -> list[tuple[int, object]]:
    """The quick-cash buttons in the payment pad, smallest note first.

    A quick note is a button whose whole accessible name is an amount, so the
    product tiles — "Rolex Accessories USh 1,500" — are not mistaken for one.
    """
    pattern = re.compile(r"^USh\s+([\d,]+)$")
    notes = []
    for node, _ in app.nodes():
        if node.get_role_name() != "button":
            continue
        match = pattern.match(app.name_of(node).strip())
        if match:
            notes.append((int(match.group(1).replace(",", "")), node))
    return sorted(notes, key=lambda note: note[0])


def run_cash_scenario(
    app: App,
    report: Report,
    db_path: Path | None,
    total: int,
    till_before: int | None,
    keeper: list[Path],
) -> None:
    """Pay the sale with a cash note and check what reached the database."""
    if db_path is None:
        report.check(False, "database found", "no posh.db — pass --db")
        return

    before = read_orders(db_path)
    snapshot = snapshot_database(db_path)
    keeper.append(snapshot)

    # The pad only takes over the cart once the cashier commits to a payment.
    open_pad, _ = app.button(lambda name: name.startswith("Charge"))
    if open_pad is None:
        report.check(False, "charge button opens the payment pad", "<no charge button>")
        return
    app.click(open_pad)
    time.sleep(0.5)
    app = App.find(app.pid)

    notes = quick_notes(app)
    covering = [(amount, node) for amount, node in notes if amount >= total]
    report.note("quick notes offered", ", ".join(format_ugx(amount) for amount, _ in notes))

    if covering:
        tendered, note_button = covering[0]
        app.click(note_button)
    else:
        # No single note covers the sale — type the amount instead.
        tendered = total + 1000
        if not app.type_into("Tendered", str(tendered)):
            report.check(
                False,
                "cash amount entered",
                f"no note covers {format_ugx(total)} and the field could not be typed into",
            )
            return

    change = tendered - total
    time.sleep(0.5)
    app = App.find(app.pid)

    readout = f"Change due {format_ugx(change)}"
    body = app.body_text()
    report.check(readout in body, "payment pad shows the change due", readout)

    confirm, label = app.button(
        lambda name: name.startswith("Charge") or name.startswith("Give change")
    )
    if confirm is None:
        report.check(False, "confirm button shows the change", "<no confirm button>")
        return
    report.check(
        label == f"Give change {format_ugx(change)}",
        "confirm button shows the change",
        label,
    )

    app.click(confirm)

    deadline = time.time() + 10
    row = None
    while time.time() < deadline:
        time.sleep(0.4)
        new = [row for order_id, row in read_orders(db_path).items() if order_id not in before]
        if new:
            row = new[-1]
            break
    if row is None:
        report.check(False, "sale reached the database", "no new order appeared")
        return

    report.check(row["total"] == total, "sale total was stored", f"{row['total']} vs {total}")
    report.check(
        row["tendered"] == tendered,
        "tendered amount was stored",
        f"{row['tendered']} vs {tendered}",
    )
    report.check(
        row["change_given"] == change,
        "change given was stored",
        f"{row['change_given']} vs {change}",
    )
    report.check(row["payment_method"] == "cash", "payment method was stored", row["payment_method"])
    report.check(row["status"] == "completed", "sale is completed", row["status"])

    toast = f"Cash {format_ugx(tendered)} · change {format_ugx(change)}"
    deadline = time.time() + 3
    seen = False
    while time.time() < deadline:
        app = App.find(app.pid)
        seen = app.has_text(toast)
        if seen:
            break
        time.sleep(0.3)
    report.check(seen, "confirmation toast shows the tender and change", toast)

    if till_before is None:
        report.note("cash drawer total skipped", "the till chip could not be read")
    else:
        expected = till_before + total
        deadline = time.time() + 3
        after = None
        while time.time() < deadline:
            app = App.find(app.pid)
            after = till_total(app.body_text())
            if after == expected:
                break
            time.sleep(0.3)
        report.check(
            after == expected,
            "cash drawer total grew by the sale",
            f"{after} vs {expected}",
        )

    delete_order(db_path, row["id"])
    report.note("smoke sale removed", row["order_no"])


def run_checks(
    app: App,
    report: Report,
    db_path: Path | None,
    keeper: list[Path],
    sell: bool = True,
) -> None:
    if not app.wait_for_ui():
        report.check(False, "webview rendered", "the window never showed any content")
        return

    app = ensure_main_till(app, report)
    app = wait_for_register(app)

    title = next(
        (app.name_of(node) for node, _ in app.nodes() if node.get_role_name() == "frame"),
        "",
    )
    report.check(title == WINDOW_TITLE, "window title", title or "<none>")

    links = {app.name_of(node) for node, _ in app.nodes() if node.get_role_name() == "link"}
    missing = [link for link in SIDEBAR_LINKS if link not in links]
    report.check(not missing, "sidebar navigation", "missing: " + ", ".join(missing) if missing else "all four links present")

    body = app.body_text()
    till = re.search(r"Till\s+([A-Za-z0-9]{1,4})\b", body)
    report.check(
        till is not None,
        "register loaded",
        f"Till {till.group(1)}" if till else "<no till code found>",
    )

    till_before = till_total(body)
    report.note("cash drawer starts at", "unread" if till_before is None else str(till_before))

    shown = re.search(r"(\d+)\s+products?\s+shown", body)
    count = int(shown.group(1)) if shown else 0
    report.check(count > 0, "products loaded from the database", f"{count} shown")

    product = next(
        (
            node
            for node, _ in app.nodes()
            if node.get_role_name() == "button"
            and "USh" in app.name_of(node)
            and "each" not in app.name_of(node)
        ),
        None,
    )
    if product is None:
        report.check(False, "product buttons rendered", "no product button found")
        return

    label = app.name_of(product)
    price = to_int(label)
    report.check(price > 0, "product button shows a price", label)

    app.click(product)
    time.sleep(1.0)
    app = App.find(app.pid)

    totals = app.label_values()
    rate_match = re.search(r"VAT \((\d+)%\)", " ".join(totals))
    rate = int(rate_match.group(1)) if rate_match else 0
    subtotal = to_int(totals.get("Subtotal", ""))
    tax = to_int(totals.get(next((k for k in totals if k.startswith("VAT")), ""), ""))
    total = to_int(totals.get("Total", ""))

    report.check(subtotal == price, "subtotal matches the product price", f"{subtotal} vs {price}")
    expected_tax = round(subtotal * rate / 100)
    report.check(tax == expected_tax, "tax is exclusive and rounded", f"{tax} vs {expected_tax} (rate {rate})")
    report.check(total == subtotal + tax, "total is subtotal plus tax", f"{total} vs {subtotal + tax}")

    charge, charge_label = app.button(lambda name: name.startswith("Charge"))
    if charge is None:
        report.check(False, "charge button shows the total", "<no charge button>")
    else:
        report.check(to_int(charge_label) == total, "charge button shows the total", charge_label)

    if sell:
        run_cash_scenario(app, report, db_path, total, till_before, keeper)
    else:
        report.note("cash sale skipped", "--no-sale")

    clear, _ = app.button(lambda name: name == "Clear")
    if clear is not None:
        app.click(clear)
        time.sleep(0.5)


# --- entry point ------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", help="path to the app binary to launch")
    parser.add_argument("--pid", type=int, help="pid of an already running app")
    parser.add_argument("--db", help="database to read (defaults to the app data dir)")
    parser.add_argument("--no-sale", action="store_true", help="skip the cash sale")
    parser.add_argument("--timeout", type=float, default=20.0, help="seconds to wait for the app")
    args = parser.parse_args()

    if not args.pid and not args.binary:
        default = os.path.join("src-tauri", "target", "release", "desktop")
        args.binary = default if os.path.exists(default) else None
        if not args.binary:
            print("No binary to launch. Build one with `bun run tauri build --no-bundle` or pass --pid.", file=sys.stderr)
            return 2

    process = None
    pid = args.pid
    if pid is None:
        binary = os.path.abspath(args.binary)
        if not os.path.exists(binary):
            print(f"Binary not found: {binary}", file=sys.stderr)
            return 2
        print(f"Launching {binary}")
        process = subprocess.Popen([binary], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        pid = process.pid

    db_path = resolve_db_path(args.db)
    keeper: list[Path] = []
    report = Report()

    try:
        try:
            app = App.find(pid, timeout=args.timeout)
        except TimeoutError as error:
            print(str(error), file=sys.stderr)
            return 1

        print(f"Driving the app on pid {pid}")
        print(f"Database: {db_path or '<not found>'}\n")
        try:
            run_checks(app, report, db_path, keeper, sell=not args.no_sale)
        except Exception as error:  # noqa: BLE001 - the report is the result
            report.check(False, "smoke test completed", str(error))

        print()
        print(report.summary())
        return 0 if report.ok else 1
    finally:
        if process is not None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()

            # The sale was written to the live database; put it back the way it
            # was. Only safe once the app we launched has let go of the file.
            if db_path is not None:
                for snapshot in keeper:
                    restore_database(snapshot, db_path)
                    print(f"Database restored from {snapshot}")

        # With --pid the database is put back by deleting the sale, so the
        # snapshots are only ever scratch space.
        for snapshot in keeper:
            snapshot.unlink(missing_ok=True)


if __name__ == "__main__":
    raise SystemExit(main())
