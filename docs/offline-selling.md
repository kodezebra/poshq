# Offline selling (A2) — design options

Status: **proposed**. No offline code is written yet. A1 still blocks charging
when a client cannot reach the main till.

## The problem

A client till currently sends every read and write to the main till. If the
LAN, the main till, or its power fails, the client shows **Offline** and
refuses to charge. A2 should let that till keep selling and reconcile when the
main till returns.

This is deliberately **not** full local-first replication. The main till stays
the shop's system of record; a client gets a small, temporary outbox.

## What must stay true

- A completed sale has a stable identity before it reaches the main till.
- Replaying the outbox can never create a second order or take money twice.
- The receipt is fixed at sale time: item names, prices, VAT, payment, till and
  timestamp are snapshots, not later lookups.
- Only the main till owns shop-wide history and reporting.
- Offline mode is an exception. The UI must make it obvious that sales are
  waiting to sync.

## Current shape

- `src/lib/db/client.ts` sends a client's Drizzle queries to
  `POST /api/db/query` and `/api/db/batch`; the main calls Rust directly.
- `src/lib/db/orders.ts` creates the order id with `crypto.randomUUID()` and
  asks the main for the next order number before writing the order and items.
- `orders` and `order_items` already store complete snapshots and payment
  fields, so the main schema does not need new columns for an offline order.
- The client already opens a local `posh.db` at startup, but its data is not
  used in client mode. It also seeds demo products, so reusing that file as a
  cache needs care.
- There is no product cache, no order outbox, and no sync endpoint.

## Options

| | Approach | What it buys | What it costs |
| --- | --- | --- | --- |
| **A** | Cache products/VAT and queue orders in `localStorage` | Smallest change; frontend-only queue; no Rust schema work | WebView storage can be cleared; no atomic multi-row write; weak place for money |
| **B** | Cache products/VAT and queue orders in a small local SQLite outbox | Durable, atomic queue; survives restarts and storage clears; reuses SQLite | A set of local Rust commands and an outbox schema; more tests |
| **C** | Replicate the full database to every till and merge later | Tills can run independently for days | Conflict resolution, IDs, voids, stock, failover and reporting all become a new product; not simple |
| **D** | Keep blocking clients while offline | Zero new risk | The shop stops selling when the main till is unreachable |

**Recommendation: B.** A sale recorded during an outage is money.
`localStorage` is acceptable for a UI preference, not for the only copy of an
order the main till has not seen. SQLite is already in the app, and a dedicated
outbox is still much smaller than option C.

Option A is only reasonable if offline means "a few minutes while someone
reboots the main till" and the shop accepts that clearing site data loses those
sales. Option C should be rejected for A2.

## Recommended shape (B)

### Local store

Use a separate `offline.db` in the app data directory, not the existing
`posh.db`. Keeping it separate means a role change or old main data can never
be mistaken for a client cache.

Tables:

- `cached_products` — the last catalog the client saw, including id, name, sku,
  price, category, image and active flag.
- `cached_settings` — at least the VAT rate and the last order number seen for
  this till and day.
- `outbox_orders` — one row per offline sale, including a client-generated
  UUID, order number, till identity, totals, payment fields and `created_at`.
- `outbox_items` — item snapshots keyed by the outbox order id.
- `outbox_attempts` — last sync error and attempt time, for the pending screen.

The outbox is append-only from the UI's point of view. A cashier can retry a
failed sync, but cannot delete a sale to make an error disappear.

### Sale path

1. Extract the pure order builder from `createOrder`: totals, VAT and payment
   settlement without a database.
2. Online: keep the current path, but cache the order number and catalog after
   a successful refresh.
3. Offline: build the same order with a local id, local order number and the
   current local time, then write the order and items to the outbox in one
   transaction.
4. The customer gets the same "charged" result and change calculation. The UI
   labels it **Waiting to sync**.
5. Order numbers keep the existing `POS-YYYYMMDD-T1-0001` shape. The sequence
   is per till and day, cached locally and seeded from the last online order.
   A missing cache starts at 1; the till code keeps other tills from
   colliding. If that ever produces a duplicate, sync rejects it rather than
   rewriting the receipt number.

### Sync path

Add one authenticated endpoint on the main:

```
POST /api/orders/sync
[ { id, orderNo, tillName, createdAt, lines, vatRate, paymentMethod,
    tendered, change } ]
```

For each order, in one transaction:

- If `orders.id` already exists, return it as **duplicate** and insert nothing.
- If `order_no` is already used by a different id, reject that order; never
  silently rewrite a receipt number.
- Recompute subtotal, tax and total from the item snapshots and reject a
  mismatch.
- Insert the order and item rows. If a product id no longer exists, keep the
  name and price snapshot and store `product_id = NULL`.
- Return accepted, duplicate and rejected ids with a short reason.

The client removes accepted and duplicate orders, keeps rejected ones, and
shows the reason. It retries accepted work automatically when the connection
returns; a rejected order needs a person.

### UI rules

- A client with a cached catalog opens the Terminal while offline. A client
  with no cache still sees the existing offline screen.
- The top bar/banner reads **Offline — selling**, with a pending count and
  pending cash total.
- Only the Terminal is writable offline. Products, Settings and order history
  require the main till; show a clear "available when connected" notice rather
  than a generic query failure.
- No voids, refunds or product edits offline.
- Cash and card can both be recorded exactly as they are online; the card
  terminal is outside Posh either way.
- The cash summary shows **pending offline cash** separately. It is not part of
  the main till's drawer until sync.

### Guardrails

- Stop new offline sales after a fixed window or queue size. A sensible first
  pass is **24 hours or 100 orders, whichever comes first**; the pending count
  is always visible.
- Sync before closing. If the queue is not empty, the close-of-day view says so.
- Never let a client become a second main till in A2.
- Keep the shared token requirement. Offline does not add a weaker auth path.

## Decisions needed before coding

1. **Durability:** option B (recommended) or option A?
2. **Offline window:** 24 hours, one shift, 100 orders, or no limit?
3. **Payment:** cash only offline, or cash and card as today?
4. **Pending sales UI:** banner only, or a small pending-sales page?
5. **Rejected order:** stop the queue at the first failure, or keep syncing the
   orders that are valid and isolate the bad one? (Recommended: isolate, so one
   bad order does not block a day's sales.)
6. **Catalog freshness:** on reconnect, sync first and then refresh the cache;
   new sales use the refreshed catalog. Queued sales keep their original
   snapshots.

## Acceptance checks (draft)

- Pull the network cable, sell two orders, restart the client: both are still
  pending with the same order numbers.
- Reconnect: each order appears exactly once on the main till, with its
  original time, till and payment.
- Break the connection mid-sync and retry: no duplicate order.
- Delete a product on the main before syncing an offline sale: the sale still
  records the product name and price from its snapshot.
- Change the token: sync is refused and the queue is untouched.
- Reach the offline limit: charging is blocked with a clear message, and the
  pending list remains readable.
- Cash summary: offline cash is shown separately and matches the queued sales.
