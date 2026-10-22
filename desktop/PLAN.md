# POS v1 — Delivery Plan

Branch: `breaking/pos-v1` (from `main` @ `2ee008d`)
Goal: a simple, local-first POS. Land on the Terminal, manage Products and Orders.
Currency: **UGX** — whole shillings only (no minor unit). VAT: **0% or 18%**, selectable, default 18%.

## Decisions locked in

| Area | Decision |
| --- | --- |
| Desktop shell | Tauri 2 + SvelteKit SPA + Svelte 5 runes |
| Storage | SQLite via **rusqlite** in Rust, file at `app_data_dir()/posh.db` |
| Query layer | **Drizzle ORM** `sqlite-proxy` → `invoke("db_query" / "db_batch")` |
| Schema source of truth | `src/lib/db/schema.ts` → `drizzle-kit generate` → `src-tauri/migrations/*.sql` |
| Atomicity | `db.batch()` → Rust executes the batch inside one SQLite transaction |
| Money | integer **UGX**, no floats, no cents; `Intl.NumberFormat("en-UG")` |
| Tax | VAT rate is a persisted setting, **0 or 18** (default 18); rate is snapshotted on each order |
| Validation | `zod` + `drizzle-zod` derived insert schemas |
| UI reuse | existing `Button/Card/Input/Table`, `bits-ui` dialogs, `svelte-sonner` toasts |
| Landing page | `/` = Terminal (no `/dashboard` prefix) |

## Commit convention

`type(scope): imperative summary` — one milestone task = one commit, each commit must build (`bun run check`) and touch one concern.

---

## M1 — Database foundation

- [x] Add deps: `drizzle-orm`, `drizzle-kit`, `drizzle-zod`, `zod`, `svelte-sonner` (+ `rusqlite` in Cargo)
- [x] `src/lib/db/schema.ts`: `products`, `orders`, `order_items`, `settings` + indexes + inferred types + zod insert schemas
  - `products`: `id`, `name`, `sku` (unique, nullable), `price` int UGX, `category`, `image_url`, `active`, timestamps
  - `orders`: `id` text uuid PK, `order_no` unique, `status` `completed|void`, `subtotal`, `tax`, `tax_rate` int, `total`, `payment_method`, `created_at`, `voided_at`
  - `order_items`: `id`, `order_id` FK cascade, `product_id` FK set null, `name` snapshot, `unit_price`, `qty`, `line_total`
  - `settings`: `key` PK text, `value` text — seeded with `vat_rate = "18"`
- [x] `drizzle.config.ts` with `out: "./src-tauri/migrations"`
- [x] Generate `src-tauri/migrations/0000_init.sql`
- [x] `src-tauri/src/db.rs`: open DB, `journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout`, `user_version` migration runner, seed local catalog (Rolex, Soda 500ml, Samosa, Bottled Water) and `vat_rate=18` when empty
- [x] `src-tauri/src/commands.rs`: `db_query`, `db_batch` (single transaction), value → JSON mapping
- [x] `src/lib/db/client.ts`: drizzle proxy driver bound to `invoke`; typed `db`
- [x] Verify: launch app, `posh.db` created, 4 seed rows, `cargo check` + `bun run check` pass

**Commit:** `feat(db): drizzle schema on rusqlite proxy with migrations and seed`

## M2 — Catalog read path

- [x] `utils.ts`: `formatUGX()` (`en-UG`, 0 decimals), `parseUGX()` (accepts `5,000`), `VAT_RATES = [0, 18]` with `"18"` default, keep `cn`
- [x] `src/lib/db/products.ts`: `listProducts({ search })`, `getProduct(id)` — search via drizzle `like`/`or` on name + sku + category
- [x] Rewrite `/products` to read from DB; debounced search; loading + empty states
- [x] Update `ProductCard` to render `formatUGX(product.price)`
- [x] Delete `src/lib/data/products.ts` — deferred to M3, where the dashboard placeholder (its last consumer) is removed

**Commit:** `feat(catalog): read products from sqlite via drizzle with UGX formatting`

## M3 — Terminal, cart, checkout

- [x] `refactor(routes)`: remove `/dashboard` prefix; `/` Terminal, `/products`, `/orders`, `/settings`; update `navigation.ts`; delete `src/lib/data/products.ts` and `src/lib/types.ts` with the old dashboard
- [x] `src/lib/stores/cart.svelte.ts`: `add/remove/setQty/clear`, derived `subtotal`, `tax`, `total`; tax uses the loaded `vat_rate`
- [x] `src/lib/db/settings.ts`: `getVatRate()`, `setVatRate(0 | 18)`
- [x] Components: `ProductTile`, `TerminalGrid`, `CartPanel`, `CartLine`, `OrderTotals`
- [x] Terminal layout: search + category filter + grid (left), cart + Charge (right); Enter adds first match (scanner-friendly)
- [x] `src/lib/db/orders.ts`: `createOrder()` via `db.batch([order, ...items])`, snapshots `tax_rate`, `order_no` `POS-YYYYMMDD-####`
- [x] Charge → atomic insert → toast → cart reset
- [x] `/settings`: VAT select (`0%` / `18%`) persisted via `settings`; changing it recalculates the open cart only — completed orders keep their snapshot

**Commits:**
1. `refactor(routes): land on terminal and flatten dashboard routes`
2. `feat(terminal): product grid, cart store and UGX totals`
3. `feat(settings): persist 0% or 18% VAT and apply it to the cart`
4. `feat(checkout): persist order and items in one transaction`

## M4 — Products CRUD

- [x] Primitives: `ui/Dialog` (bits-ui), `Field`, `Select`, `Badge`, `EmptyState`, `PageHeader`
- [x] `ProductForm` shared by create + edit; zod validation; UGX price input
- [x] `db/products.ts`: `createProduct`, `updateProduct`, `deleteProduct`
- [x] `/products`: add/edit dialog, delete confirmation, toasts

**Commits:**
1. `feat(ui): add form primitives and bits-ui dialog wrapper`
2. `feat(products): create, edit and delete with validated dialog form`

## M5 — Orders

- [x] `db/orders.ts`: `listOrders({ search, status })`, `getOrder(id)` with items
- [x] `/orders`: table, status filter, search by order no, empty state
- [x] `/orders/[id]`: header, items table, UGX totals, payment method
- [x] Void (status change) + delete (cascade items) behind confirmation

**Commits:**
1. `feat(orders): history list with status and search`
2. `feat(orders): detail view, void and delete`
3. `fix(db): keep SQL out of user-facing errors` — landed before the two above so the write paths share the plain wording

## M6 — Hardening & handoff

- [x] Unified error handling: Rust `Result<_, String>` → toast; no silent failures
- [x] Failures shown to a cashier never carry SQL: Rust logs the statement, the UI words the reason plainly
- [x] Loading/empty states on every async surface; focus search on Terminal mount
- [x] `vitest` for `parseUGX` / `formatUGX` / cart totals at 0% and 18% VAT
- [x] README: run, DB location, migration workflow, UGX/VAT notes
- [x] QA pass: create → edit → search → add to cart → qty → charge → orders → void → delete
- [x] `bun run check`, `cargo clippy -- -D warnings`, `bun run tauri build` smoke
  - `tauri build` compiles and links the app; the AppImage packaging step downloads `linuxdeploy`
    from GitHub, so bundling itself needs network access. Packaging is verified on a networked machine.
- [x] Real-app verification: the built binary was driven through the accessibility bus —
  add to cart → charge → the order landed in SQLite → the Orders page rendered it
  - `scripts/real-app-smoke.py` keeps this repeatable: it asserts the window, the sidebar,
    the products loaded from SQLite and the totals, then empties the cart without charging
- [x] Cold start from an empty database: the binary recreates the schema, applies the
  migrations and seeds the catalog by itself

**Commits:**
1. `fix(db): keep SQL out of user-facing errors`
2. `chore(release): pos v1 polish, tests and docs`
3. `test(app): smoke-test the shipped binary through the accessibility bus`

## M7 — Cash handling & change

A till has to know how much cash it was handed and how much change it gave
back. Everything else follows: the drawer total, the order history, and the
proof that a sale was actually paid for in full.

- [x] `src/lib/payment.ts`: pure money helpers — `changeDue`, `shortfall`, `settle`,
      `quickCash`, `CASH_NOTES`, `PaymentMethod`
- [x] `src/lib/db/schema.ts`: `orders.tendered` + `orders.change_given` (integer UGX)
- [x] Migration `0001_cash_handling.sql`, backfilling legacy cash orders, registered in `MIGRATIONS`
- [x] `db/orders.ts`: `createOrder()` settles the payment and refuses a sale that was not paid for;
      `getCashSummary()` totals the cash in the drawer for the local day
- [x] `PaymentPad` in the cart footer: Cash/Card, tendered amount, exact + quick-note buttons,
      live change readout, confirm blocked while the sale is short
- [x] Terminal shows the till total; the orders list and detail show tendered and change
- [x] Unit tests for the tender and change maths
- [x] Real-app smoke test covers cash → change → the persisted row
  - pays with the first quick note that covers the total, asserts the change readout and the
    "Give change" label, reads the row back out of SQLite, then removes the sale and restores
    the database snapshot it took beforehand
- [x] `bun run check`, `bunx vitest run` (45 tests), `cargo clippy --all-targets -- -D warnings`,
  `cargo test` (9 tests), `bun run tauri build --no-bundle`
  - bundling still needs `linuxdeploy` from GitHub; packaging is verified on a networked machine

**Commits:**
1. `docs(plan): plan M7 cash handling and change`
2. `feat(db): store tendered and change on orders`
3. `feat(payment): tender, change and quick-cash helpers`
4. `feat(checkout): settle the payment and total the till`
5. `feat(terminal): payment pad for cash and card`
6. `feat(orders): show tendered and change in the history`
7. `test(app): cover cash and change in the real-app smoke test`

## M8 — Interface density

The register spent too much of the window on chrome: a 56px top bar, a 256px
sidebar with a register card, and spacious page headers and tables. On a
1366×768 till that left little room for products. This pass tightens the shell
and every list surface without hiding information or shrinking tap targets
below the comfortable range.

- [x] Shell: 48px top bar, 64px icon rail (the mobile drawer keeps its labels),
      `dvh` heights, compact page headers and empty states
      *(superseded by M9: the frame is now 44/56)*
- [x] Terminal: inline search/category/till header, auto-fill product grid,
      two-step cart → payment view so cart lines keep their height
- [x] Cart lines: one row per line with stepper, line total and remove
- [x] Catalog: compact list by default, grid toggle, per-row action menu
      (`ActionMenu`, built on bits-ui)
- [x] Orders: one Total column with a VAT note, whole-row links, a back button
      and sticky summary on the detail page
- [x] Settings: choosing a rate saves it, as a segmented control with a
      keyboard focus ring
- [x] `bun run check`, `bunx vitest run` (45 tests),
      `bun run tauri build --no-bundle`
- [x] Real-app smoke test against the release binary: 18 checks passed,
      including the cash pad's "Give change" confirm label

**Commits:**
1. `feat(layout): compact the shell to a top bar and icon rail`
2. `feat(terminal): tighten the register and split cart from payment`
3. `feat(catalog): add a compact list view and row actions`
4. `feat(orders): condense the history and detail views`
5. `feat(settings): save the VAT rate on choose`
6. `test(app): cover the compact interface in the smoke test`
7. `docs(plan): record M8 interface density`
8. `feat(orders): compact the payment summary cell`

## M9 — The Instrument

M8 made the app dense. Density without a system reads as cramped: the palette
carried three competing accents, body copy sat at weight 300, and a 1.27:1
hairline was the only border, so controls did not look operable. This pass
replaces the Stripi tokens with a measured system and restyles the surfaces
that carry money.

The direction is `DESIGN-instrument.md`: dark chrome, a warm paper work
surface, one filled action, state as a dot plus a word, and money as the
largest thing on screen.

- [x] Tokens: ultramarine action at 8.29:1, danger/success/warn/info measured,
      chrome-context state lightness, decorative vs control borders
- [x] Type: Archivo and JetBrains Mono, minimum weight 400, tabular numerals
- [x] Frame: 44px dark top bar, 56px rail with a 2px active bar
- [x] Controls: 6px rectangles, neutral secondary, no pills outside status dots
- [x] Terminal: 32px hero total over a rule, `Charge` as the only filled
      action at 44px, payment pad with `Amount due` and a 44px commit
- [x] Orders: sticky header under the chrome bar, sortable columns with
      `aria-sort`, right-aligned money and counts, mono order numbers
- [x] Fixed: 4.29:1 `ruby`, 4.49:1 muted text, 300-weight body, the invisible
      focus on a product row, 28px filter chips
- [x] `bun run check`, `bunx vitest run` (52 tests),
      `bun run tauri build --no-bundle`
- [x] Real-app smoke test against the release binary: 18 checks passed
- [x] Sorting verified on the running app: date descending by default,
      Order ascends `POS-20261022-0001` → `POS-20261023-0001`, Total reverses

**Commits:**
1. `feat(design): adopt the instrument palette and Archivo`
2. `feat(layout): frame the app in dark chrome`
3. `style(ui): square the controls and neutralise secondary`
4. `style(terminal): make the total the hero of the sale`
5. `feat(orders): make the table a working instrument`
6. `refactor(tokens): put the quiet text step in its right place`
7. `fix(till): bring the category chips up to control height`
8. `fix(products): show focus when a product row is reached by keyboard`
9. `docs(design): record the instrument system`

Not in this milestone, because the state does not exist yet: a status strip
(no operator or shift model), receipts (printing is out of scope for v1), and
offline trading (no queue).

---

## Milestone gates

| Gate | Pass condition |
| --- | --- |
| M1 | App starts, DB + seed exist, one round-trip query works |
| M2 | Catalog renders from SQLite; search hits DB, not memory |
| M3 | Checkout creates order + items together; totals match UGX math at 0% and 18%; each order stores its own rate |
| M4 | Full product lifecycle from the UI; invalid input blocked |
| M5 | Order history is auditable; void never deletes silently |
| M6 | Green checks, QA script passes, docs accurate |
| M7 | A cash sale stores what was tendered and the change given back; a short sale cannot be completed; the drawer total matches the sales behind it |
| M8 | The register fits a 1366×768 till without scrolling for the common case; cart, catalog and order rows stay readable; every control keeps a keyboard focus ring |
| M9 | Every text and control pair meets WCAG AA on its own surface; one filled action per surface; the till's total is the largest figure at 1366×768; tables sort with `aria-sort` and keep their header; smoke stays green |

## Out of scope for v1

Auth/roles, receipts & printing, stock counts, refunds/partial payments, multi-register sync, per-product VAT classes, i18n.

## Rollback

`breaking/pos-v1` is isolated. `main` stays shippable at `2ee008d`; revert a milestone by reverting its commit(s). No remote configured yet, so nothing is published.
