#!/usr/bin/env python3
"""Smoke-test the real Posh desktop app through the accessibility bus.

The unit tests cover the arithmetic. This covers the whole chain in the
shipped binary: webview -> Tauri IPC -> Rust -> SQLite -> drizzle -> UI.

The app is driven the way a screen reader would drive it, so the assertions
are about what a cashier would actually see: the window title, the sidebar,
the products loaded from the database, and the totals shown on screen.

The check is non-destructive. It adds one product to the cart, asserts the
totals, then empties the cart again. It never charges a sale.

Usage:
    python3 scripts/real-app-smoke.py                      # launch the release build
    python3 scripts/real-app-smoke.py --binary path/to/desktop
    python3 scripts/real-app-smoke.py --pid 12345          # attach to a running app

Needs an X or Wayland session with the AT-SPI accessibility bus running
(at-spi2-core). On GNOME, install `at-spi2-core` and log in over a real
session rather than a nested one.
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
import time

import gi

gi.require_version("Atspi", "2.0")
from gi.repository import Atspi  # noqa: E402

WINDOW_TITLE = "Posh — Point of Sale"
SIDEBAR_LINKS = ("Terminal", "Products", "Orders", "Settings")


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


# --- checks -----------------------------------------------------------------


class Report:
    def __init__(self) -> None:
        self.checks: list[tuple[bool, str, str]] = []

    def check(self, ok: bool, label: str, detail: str = "") -> bool:
        self.checks.append((bool(ok), label, detail))
        mark = "PASS" if ok else "FAIL"
        print(f"  [{mark}] {label}" + (f" — {detail}" if detail else ""))
        return bool(ok)

    @property
    def ok(self) -> bool:
        return all(ok for ok, _, _ in self.checks)

    def summary(self) -> str:
        failed = [label for ok, label, _ in self.checks if not ok]
        if not failed:
            return f"{len(self.checks)} checks passed"
        return f"{len(failed)} of {len(self.checks)} checks failed: " + "; ".join(failed)


def run_checks(app: App, report: Report) -> None:
    if not app.wait_for_ui():
        report.check(False, "webview rendered", "the window never showed any content")
        return

    title = next(
        (app.name_of(node) for node, _ in app.nodes() if node.get_role_name() == "frame"),
        "",
    )
    report.check(title == WINDOW_TITLE, "window title", title or "<none>")

    links = {app.name_of(node) for node, _ in app.nodes() if node.get_role_name() == "link"}
    missing = [link for link in SIDEBAR_LINKS if link not in links]
    report.check(not missing, "sidebar navigation", "missing: " + ", ".join(missing) if missing else "all four links present")

    body = app.body_text()
    report.check("Till 01" in body, "register loaded", "Till 01" if "Till 01" in body else "<not found>")

    shown = re.search(r"(\d+)\s+shown", body)
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

    charge = next(
        (node for node, _ in app.nodes() if node.get_role_name() == "button" and app.name_of(node).startswith("Charge")),
        None,
    )
    if charge is None:
        report.check(False, "charge button shows the total", "<no charge button>")
    else:
        charge_label = app.name_of(charge)
        report.check(to_int(charge_label) == total, "charge button shows the total", charge_label)

    clear = next(
        (node for node, _ in app.nodes() if node.get_role_name() == "button" and app.name_of(node) == "Clear"),
        None,
    )
    if clear is not None:
        app.click(clear)
        time.sleep(0.5)


# --- entry point ------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", help="path to the app binary to launch")
    parser.add_argument("--pid", type=int, help="pid of an already running app")
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

    try:
        try:
            app = App.find(pid, timeout=args.timeout)
        except TimeoutError as error:
            print(str(error), file=sys.stderr)
            return 1

        print(f"Driving the app on pid {pid}\n")
        report = Report()
        try:
            run_checks(app, report)
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


if __name__ == "__main__":
    raise SystemExit(main())