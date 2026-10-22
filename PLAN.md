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
- [ ] Delete `src/lib/data/products.ts` — deferred to M3, where the dashboard placeholder (its last consumer) is removed

**Commit:** `feat(catalog): read products from sqlite via drizzle with UGX formatting`

## M3 — Terminal, cart, checkout

- [x] `refactor(routes)`: remove `/dashboard` prefix; `/` Terminal, `/products`, `/orders`, `/settings`; update `navigation.ts`; delete `src/lib/data/products.ts` and `src/lib/types.ts` with the old dashboard
- [x] `src/lib/stores/cart.svelte.ts`: `add/remove/setQty/clear`, derived `subtotal`, `tax`, `total`; tax uses the loaded `vat_rate`
- [x] `src/lib/db/settings.ts`: `getVatRate()`, `setVatRate(0 | 18)`
- [x] Components: `ProductTile`, `TerminalGrid`, `CartPanel`, `CartLine`, `OrderTotals`
- [ ] Terminal layout: search + category filter + grid (left), cart + Charge (right); Enter adds first match (scanner-friendly)
- [ ] `src/lib/db/orders.ts`: `createOrder()` via `db.batch([order, ...items])`, snapshots `tax_rate`, `order_no` `POS-YYYYMMDD-####`
- [ ] Charge → atomic insert → toast → cart reset
- [x] `/settings`: VAT select (`0%` / `18%`) persisted via `settings`; changing it recalculates the open cart only — completed orders keep their snapshot

**Commits:**
1. `refactor(routes): land on terminal and flatten dashboard routes`
2. `feat(terminal): product grid, cart store and UGX totals`
3. `feat(settings): persist 0% or 18% VAT and apply it to the cart`
4. `feat(checkout): persist order and items in one transaction`

## M4 — Products CRUD

- [ ] Primitives: `ui/Dialog` (bits-ui), `Field`, `Select`, `Badge`, `EmptyState`, `PageHeader`
- [ ] `ProductForm` shared by create + edit; zod validation; UGX price input
- [ ] `db/products.ts`: `createProduct`, `updateProduct`, `deleteProduct`
- [ ] `/products`: add/edit dialog, delete confirmation, toasts

**Commits:**
1. `feat(ui): add form primitives and bits-ui dialog wrapper`
2. `feat(products): create, edit and delete with validated dialog form`

## M5 — Orders

- [ ] `db/orders.ts`: `listOrders({ search, status })`, `getOrder(id)` with items
- [ ] `/orders`: table, status filter, search by order no, empty state
- [ ] `/orders/[id]`: header, items table, UGX totals, payment method
- [ ] Void (status change) + delete (cascade items) behind confirmation

**Commits:**
1. `feat(orders): history list with status and search`
2. `feat(orders): detail view, void and delete`

## M6 — Hardening & handoff

- [ ] Unified error handling: Rust `Result<_, String>` → toast; no silent failures
- [ ] Loading/empty states on every async surface; focus search on Terminal mount
- [ ] `vitest` for `parseUGX` / `formatUGX` / cart totals at 0% and 18% VAT
- [ ] README: run, DB location, migration workflow, UGX/VAT notes
- [ ] QA pass: create → edit → search → add to cart → qty → charge → orders → void → delete
- [ ] `bun run check`, `cargo clippy -- -D warnings`, `bun run tauri build` smoke

**Commit:** `chore(release): pos v1 polish, tests and docs`

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

## Out of scope for v1

Auth/roles, receipts & printing, stock counts, refunds/partial payments, multi-register sync, per-product VAT classes, i18n.

## Rollback

`breaking/pos-v1` is isolated. `main` stays shippable at `2ee008d`; revert a milestone by reverting its commit(s). No remote configured yet, so nothing is published.
