# Posh — Point of Sale

A desktop point-of-sale app for the shop's tills, built with Tauri, SvelteKit
and SQLite. It opens on the **Terminal**: search the catalog, build a cart,
charge the sale, and keep a history of every order — with the ability to void
or delete one.

The tills run the same app. One **main till** owns the database and serves a
small HTTP API over the shop's LAN. The other **client tills** find it on the
network and send their sales to it. There is no internet, account or cloud
service involved.

---

## What it does

| Screen | Route | What a cashier gets |
| --- | --- | --- |
| **Terminal** | `/` | Search and filter the catalog, add items to the cart, set quantities, charge the sale |
| **Products** | `/products` | Full CRUD over the catalog, with search and category filters |
| **Orders** | `/orders` | Every sale, newest first, filterable by status, searchable by order number or till |
| **Order detail** | `/orders/[id]` | The items of one sale, its VAT snapshot, the till that rang it, and the actions to **void** or **delete** it |
| **Settings** | `/settings` | The register's VAT rate (0% or 18%), this till's LAN details, and changing its role |

Prices are always whole Ugandan shillings. VAT is added **on top** of the
subtotal and is snapshotted onto each completed order, so changing the rate
later never rewrites history.

---

## Stack

| Layer | Choice |
| --- | --- |
| Shell | [Tauri 2](https://tauri.app) — Rust core, native webview |
| UI | SvelteKit 2 (SPA mode) + Svelte 5 runes, Tailwind CSS 4 |
| Data access | Drizzle ORM on a `sqlite-proxy` driver |
| Database | SQLite via `rusqlite` (bundled), owned by the Rust side |
| Tests | Vitest (frontend), `cargo test` (Rust) |

### Why the split is like this

Drizzle gives typed queries and generates the SQL migrations. But it does not
own the database file. Tauri does: Rust opens the file, sets the PRAGMAs, runs
the migrations and seeds the first catalog. Drizzle talks to it through
`sqlite-proxy`, which forwards each statement to Rust — directly on the main
till, or over the LAN API to the main till from a client.

```
main till
  Svelte component
    └─ src/lib/db/orders.ts        typed Drizzle queries
         └─ src/lib/db/client.ts   sqlite-proxy → invoke("db_query")
              └─ src-tauri/src/commands.rs   rusqlite → posh.db

client till
  Svelte component
    └─ src/lib/db/orders.ts        the same typed queries
         └─ src/lib/db/client.ts   sqlite-proxy → POST /api/db/query
              └─ main till's src-tauri/src/server.rs → the same rusqlite connection
```

---

## Prerequisites

- **Rust** 2024 edition (1.85+). Check with `rustc --version`.
- **Node.js** 20+ (the repo also works with [Bun](https://bun.sh), which is
  what the commands below use).
- **Tauri 2 system dependencies** — the platform packages Tauri lists for
  [Linux](https://tauri.app/start/prerequisites/#linux),
  [macOS](https://tauri.app/start/prerequisites/#macos) and
  [Windows](https://tauri.app/start/prerequisites/#windows). On Debian/Ubuntu
  that is roughly `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev
  librsvg2-dev build-essential curl wget file libssl-dev`.

---

## Getting started

```bash
bun install                # or: npm install
bun run tauri dev          # starts Vite and the desktop app
```

The window opens on the Terminal with a seeded catalog. The dev server listens
on <http://localhost:1420>; `tauri dev` starts it for you, so you only need the
one command.

### Setting up the tills

On first run the app asks whether this computer is the **main till** or a
**client till**. Every install also gets a name (for example *Front counter*)
and a short code (for example `T1`).

1. Start the app on the computer that will keep the database and choose **Main
   till**. The setup screen shows two values: the till's LAN address and a
   12-character token. Copy both.
2. Connect each other computer to the same WiFi or LAN, start the app and
   choose **Client till**. The setup screen searches the network and lists the
   main tills it finds; pick one, then enter the token. If nothing is found,
   type the main till's address instead.
3. Leave the main till open while the shop is trading. Client tills pause
   selling when they cannot reach it; A1 does not queue offline sales.

Both roles use the same desktop build and the same database schema. The main
till binds port `47821` on every interface. If clients cannot connect, allow
inbound TCP `47821` through the main computer's firewall and make sure the
network is marked **private**, not public.

Automatic discovery uses mDNS on UDP `5353` (`_posh._tcp.local.`). If the
client's list stays empty, allow UDP `5353` on both computers' firewalls and
check that the WiFi does not isolate clients from each other (guest networks
often do). Typing the address always works as a fallback.

The advertisement carries the till's name, code, address and version, never
the token. A client still has to enter the token before it can connect.

The role, address and token are in **Settings → This till**, where they can be
copied or changed. Changing setup stops the LAN listener and returns the app to
first run; the data on the main till is untouched.

> **Keep the token inside the shop.** A1 uses plain HTTP with a shared token,
> not TLS or user accounts. Anyone with the address and token can use the
> database, so never forward or expose port `47821` to the internet.

Order numbers include the till code — `POS-20261023-T1-0001` — so two tills
cannot issue the same number. Give each till its own name and code when you set
it up: the terminal's drawer total is filtered by till name, so two tills that
share a name will share a drawer total, and two that share a code will race for
the same order number. Orders rang before this change keep their old
`POS-YYYYMMDD-0001` numbers and show no till; on the main till they still count
towards the day's cash.

### Building a distributable

```bash
bun run tauri build
```

The bundle lands in `src-tauri/target/release/bundle/` (`.deb`/`.rpm`/`.AppImage`
on Linux, `.app`/`.dmg` on macOS, `.msi`/`.exe` on Windows). Note that the
frontend is built with `adapter-static` in SPA mode, so the app is fully
self-contained.

The planned GitHub Actions release setup — platforms, jobs, versions, signing
and costs — is described in [`../docs/github-actions-release.md`](../docs/github-actions-release.md).

### Scripts

| Command | What it does |
| --- | --- |
| `bun run tauri dev` | Run the desktop app with hot reload |
| `bun run tauri build` | Build the desktop app and its installers |
| `bun run dev` | Vite only, without the desktop shell (the app will complain that the database is unavailable) |
| `bun run build` | Build the frontend only |
| `bun run check` | `svelte-check` over the whole project |
| `bun run test` | Vitest unit tests |
| `bun run test:watch` | Vitest in watch mode |
| `bunx drizzle-kit generate` | Generate a new SQL migration from the schema |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Rust tests |
| `python3 scripts/real-app-smoke.py` | Smoke-test the built binary through the accessibility bus |

---

## Where the data lives

The authoritative database is a single SQLite file on the **main till**, inside
the OS app-data directory named after the app identifier `app.poshq`:

| OS | Path |
| --- | --- |
| Linux | `~/.local/share/app.poshq/posh.db` |
| macOS | `~/Library/Application Support/app.poshq/posh.db` |
| Windows | `%APPDATA%\app.poshq\posh.db` |

SQLite runs in **WAL** mode, so the directory also holds `posh.db-wal` and
`posh.db-shm` while the app is running. To inspect or back up the database,
use `sqlite3 posh.db ".backup backup.db"` rather than copying the file — a
plain `cp` of a WAL database can miss recent transactions. Back up the main
till; client tills do not hold the shop's orders.

Deleting the file on the main till gives you a fresh register: the next start
recreates the schema and re-seeds the catalog.

---

## Changing the database

`src/lib/db/schema.ts` is the single source of truth. The workflow is:

1. Edit `src/lib/db/schema.ts`.
2. Generate the SQL:
   ```bash
   bunx drizzle-kit generate
   ```
   This writes a new numbered file to `src-tauri/migrations/` (for example
   `0002_till_identity.sql`) plus a snapshot in `src-tauri/migrations/meta/`.
3. Register the new file in `src-tauri/src/db.rs`:
   ```rust
   const MIGRATIONS: &[&str] = &[
       include_str!("../migrations/0000_init.sql"),
       include_str!("../migrations/0001_cash_handling.sql"),
       include_str!("../migrations/0002_till_identity.sql"),
   ];
   ```
   The files are embedded at compile time, so the list must be updated by hand —
   the app will not find a migration that is not listed.
4. Commit the schema, the generated SQL and the `db.rs` change together.

Migrations are applied on start-up, tracked by `PRAGMA user_version`, each in
its own transaction. Adding a file to the list and restarting the app is
enough; nothing else is run by hand.

### Seed data

`src-tauri/src/db.rs` seeds four products (`Rolex`, `Soda 500ml`, `Samosa`,
`Bottled Water`) **only when the products table is empty**, and always ensures
the `vat_rate` setting exists. Seeding is idempotent, so it never overwrites
real catalog data.

---

## Money and VAT

- **UGX has no minor unit.** Every amount is a whole number of shillings, stored
  as an integer. `formatUGX(3500)` renders `USh 3,500`; `parseUGX` reads back
  anything a cashier types (`5,000`, `UGX 5000`, a pasted `USh 2,360`).
- **VAT is exclusive.** `total = subtotal + tax`, where
  `tax = round(subtotal × rate / 100)`.
- **The register trades at 0% or 18%.** The rate lives in the `settings` table
  and is changed on the Settings screen.
- **Changing the rate only affects the open cart.** Every completed order stores
  the `tax_rate` it was charged at, so past receipts never change.
- The cart is a single open sale at a time. Adding the same product twice
  merges into one line and keeps the price captured at that moment.

---

## Project layout

```
src/
  lib/
    components/     layout, terminal, product, table and ui primitives
    db/             schema, client (invoke or LAN), queries and error wording
    stores/         the open cart and the live till connection
    connection.ts   role, address, token and health checks
    discovery.ts    find main tills over mDNS
    utils.ts        money, tax, dates and error messages
  routes/           Terminal, Products, Orders, Order detail, Settings
src-tauri/
  src/db.rs         connection, PRAGMAs, migrations, seed
  src/commands.rs   the db_query / db_batch bridge
  src/server.rs     LAN API, token check, mDNS and server lifecycle
  migrations/       generated SQL, embedded at compile time
scripts/
  real-app-smoke.py drives the built binary through the accessibility bus
```

---

## Errors

Two layers keep SQL out of what a cashier ever sees:

1. **Rust** logs the failing statement to stderr for the developer, but returns
   only the database's own message to the frontend.
2. **The frontend** maps the database's vocabulary to plain wording — a
   duplicate SKU reads *"That SKU is already used by another product."* — and
   replaces anything that still looks like SQL with *"The database refused that
   request. Please try again."*

`src/lib/db/errors.ts` holds the shared mapping; `errorMessage()` in
`src/lib/utils.ts` walks an error's `cause` chain and applies the sanitiser.

---

## Testing

```bash
bun run test                                    # Vitest: money, tax, cart, till config, order numbers
cargo test --manifest-path src-tauri/Cargo.toml  # Rust: migrations, seed, LAN token
bun run check                                    # svelte-check
```

The unit tests cover the arithmetic a cashier cannot afford to get wrong, the
role/address/token rules, and the promise that errors never leak SQL. Anything
that needs a database or a window is covered by the manual QA pass instead of
by a browser harness.

### Verifying the real app

`scripts/real-app-smoke.py` drives the built binary the way a screen reader
would: it reads the accessibility tree of the running window and asserts what
a cashier would see — the window title, the sidebar, the products loaded from
SQLite, and the totals on screen.

```bash
bun run tauri build --no-bundle       # produces src-tauri/target/release/desktop
python3 scripts/real-app-smoke.py     # launches it, checks it, shuts it down
python3 scripts/real-app-smoke.py --pid 12345   # attach to a running app
```

It adds one product to the cart, checks that the subtotal, the tax and the
total agree with each other, then pays for the sale with a cash note and reads
it back out of SQLite. The database is snapshotted first and restored after the
run, so the sale is not left behind. On a fresh install it chooses the main
till with the default name and code, then proceeds.

This is the only check that exercises the whole chain — webview, Tauri IPC,
Rust, SQLite, drizzle and the UI — in the binary that actually ships. It needs
an X or Wayland session with the accessibility bus available (`at-spi2-core`);
on GNOME, log in over a real session rather than a nested one.

---

## Not in this version

Deliberately out of scope for v1: user accounts and roles, receipts and
printing, stock counts, refunds and partial payments, offline selling or a
client-side queue, TLS on the LAN, per-product VAT classes, and
internationalisation.
