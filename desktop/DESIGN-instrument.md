# The Instrument

Posh's design system. It replaces the Stripi system recorded in
`DESIGN-stripe.md`, which is kept only as a record of what was there before.

The counter is the product. This system exists to make one screen — the till —
fast to read at arm's length, in a shop with fluorescent light, a queue of
people and a machine that may lose power mid-sale. Everything else is
supporting cast.

Tokens live in `src/app.css`. This file explains what they are for and when
not to use them.

## Five principles

1. **The counter is the only stage.** The register is the product's face. Any
   screen can be reached from it in one action and left in one.
2. **Speed is a visual property.** Dense rows, short labels, no motion that
   delays a decision. A cashier should not have to aim.
3. **State is never colour alone.** Every status is a dot plus a word.
4. **Chrome recedes, money advances.** The frame is dark and quiet; the amount
   is the largest thing on the screen.
5. **Degraded is a state, not an error.** Offline, no printer, no database —
   each is shown as a condition with a next step, not as a crash.

## Surfaces

One frame, one work surface. Cards and wells are tonal steps of the work
surface, not new contexts, so a screen never gets its own background colour.

| Surface        | Token          | Hex       | Carries                                    |
| -------------- | -------------- | --------- | ------------------------------------------ |
| Chrome         | `chrome`       | `#14181D` | Top bar (44px), nav rail (56px)             |
| Work           | `canvas-soft`  | `#FAFAF9` | The page, including the till                |
| Card / row     | `canvas`       | `#FFFFFF` | Tables, panels, inputs                      |
| Well           | `canvas-sunken`| `#F2F2EF` | Table headers, disabled fields              |

Chrome is a frame, not a theme. Nothing in the work area is dark.
`chrome-raised` (`#1B2027`) is only for the logo tile, hover, and the active
nav item; `chrome-line` (`#262B31`) only for rules on chrome.

## Colour

One filled colour: ultramarine. It means "this is the action", and there is at
most one such action per surface.

| Role            | Token                | Hex       | Measured                       |
| --------------- | -------------------- | --------- | ------------------------------ |
| Action          | `primary`            | `#2B3AC7` | 8.29:1 white-on, 7.94:1 on work |
| Action, pressed | `primary-press`      | `#1F2A96` | 11.48:1 white-on               |
| Action, hover   | `primary-hover`      | `#3A4AE0` | 6.49:1 white-on                |
| Action on chrome | `action-on-chrome`  | `#8E9BFF` | 7.03:1 on chrome               |
| Selection wash   | `primary-subdued`   | `#DFE2FA` | Never carries text alone       |
| Danger           | `danger`             | `#B42318` | 6.29:1                         |
| Success          | `success`            | `#15803D` | 4.80:1                         |
| Warning          | `warn`               | `#B45309` | 4.81:1                         |
| Information      | `info`               | `#475569` | 7.26:1                         |

**Ultramarine is never used on dark chrome.** `primary` is 2.15:1 there. The
chrome-context action is `action-on-chrome`, and it is chosen by context, not
per component.

Work-surface greens and reds also fail on chrome (about 2:1). State on the
frame therefore has its own lightness:

| State on chrome | Token                 | Hex       |
| --------------- | --------------------- | --------- |
| Success         | `success-chrome`      | `#3DD68C` |
| Danger          | `danger-chrome`       | `#FF9B8F` |
| Warning         | `warn-chrome`         | `#F5B544` |

Text:

| Role            | Token           | Hex       | Measured |
| --------------- | --------------- | --------- | -------- |
| Primary         | `ink`           | `#12151A` | 17.52:1  |
| Secondary       | `ink-secondary` | `#3A4048` | 10.02:1  |
| Quiet           | `ink-mute`      | `#5C6570` | 5.66:1   |
| Faint           | `ink-faint`     | `#6B7280` | 4.63:1 on work |
| On chrome       | `chrome-ink`    | `#F5F5F4` | 16.34:1  |
| Quiet on chrome | `chrome-mute`   | `#9AA1A9` | 6.83:1   |

Lines are split by role and must not be swapped:

- `hairline` (`#E4E4E1`) — decorative dividers only, roughly 1.3:1.
- `hairline-input` (`#8C8C87`) — anything that bounds a control, 3.23:1.

A border that a user must see to operate the control is an input border. A
border that separates two rows is a hairline.

`ruby` and `brand-dark` remain in the tokens as aliases for `danger` and
`chrome` while older screens migrate. Do not add new uses; replace them when
the file is touched.

Payment methods will eventually carry their own brand colours (MTN yellow,
Airtel red). They are identities, not actions, and they never become fills.

## Type

Archivo carries the interface and every numeral. JetBrains Mono carries
identifiers — order numbers, SKUs, barcodes. No serif: it belongs to the
editorial direction and would fight the instrument.

Minimum weight is 400. The previous system set body copy at 300, which was its
single largest legibility defect at 1366px.

| Step          | Size | Weight | Use                                      |
| ------------- | ---- | ------ | ---------------------------------------- |
| `display-lg`  | 32px | 500    | The amount due. One per screen.           |
| `display-md`  | 26px | 500    | Secondary money, page-level figures       |
| `heading-lg`  | 22px | 500    | Page titles                              |
| `heading-md`  | 20px | 500    | Section titles                           |
| `heading-sm`  | 18px | 500    | Panel titles                             |
| `body-lg`     | 16px | 400    | Long-form only (settings, help)          |
| `body-md`     | 15px | 400    | Default body                             |
| `body-tabular`| 14px | 400    | Table cells                              |
| `button-md`   | 15px | 500    | Default button label                     |
| `button-sm`   | 14px | 500    | Compact button label                     |
| `caption`     | 13px | 400    | Labels, metadata, table headers          |
| `micro`       | 11px | 400    | Legal, timestamps in dense places        |
| `micro-cap`   | 10px | 500    | Eyebrows, all caps, +0.6px tracking      |

Numerals are tabular everywhere (`body` sets it, `tnum` reinforces it in
mixed-type contexts). A price, a count and a timestamp all occupy fixed widths
so columns line up and nothing shifts when a total changes.

Utilities: `tnum` for figures, `code` for identifiers, `eyebrow` for caps.

## Geometry

- Top bar 44px, nav rail 56px, status strip 28px (when it exists).
- Controls 32px (compact) and 36px (default). Text fields are 40px so the
  caret and the value are not cramped. 44px is reserved for the one decision
  that ends a sale.
- Radius 6px on controls and cards, 8px on surfaces, 9999px only on status
  dots. A control with a large radius reads as a badge.
- 4px grid (4/8/12/16/24/32/64), plus 2px where an optical offset needs it.
- Borders structure the page. Shadows are for overlays that must be dismissed
  (`shadow-elev-2`); cards do not float.

The target display is 1366×768. Every vertical decision is measured against
that height, not against a laptop's 900px.

## State

A status is a dot and a word, at whatever size the surface allows:

- Work surface: `success` / `warn` / `danger` / `info` on `ink-secondary`.
- Chrome: the `*-chrome` tokens, same shape.

Never rely on the dot alone: the word carries the meaning, the dot carries the
scan. Never fill a pill. Never use a colour with no word next to it.

## Signature devices

These are the pieces that make the product recognisable. Keep them consistent.

1. **Money as typography.** The total is the largest number on screen, at
   `display-lg`, tabular, with its label in `caption` on the baseline. It is
   not a badge, not a chip, not a card.
2. **One filled action.** `Charge` is the only ultramarine fill on the till.
   Everything nearby is outlined or ghost.
3. **Chrome frame.** The dark bar and rail are the product's silhouette. The
   active nav item is a 2px action bar on a raised surface, not a tinted block.
4. **Dot plus label.** Status never travels as colour alone.
5. **Mono identifiers.** Order numbers and SKUs are visibly machine data.
6. **Right-aligned numbers.** In any table, money and counts sit on the right
   edge; names and dates on the left.
7. **Sticky headers.** A table header parks under the 44px bar while its rows
   scroll, so the column a cashier is reading is always named.

## Components

| Component            | State                                                        |
| -------------------- | ------------------------------------------------------------ |
| `TopBar`             | Dark chrome, 44px, wordmark, identity menu                   |
| `Sidebar`            | 56px rail, 2px active bar, till block on chrome              |
| `Button`             | 5 variants; primary/secondary/dark/ghost/danger; 32/36px and icon |
| `Badge`              | Dot plus label on state tokens                               |
| `Table`              | Sticky header, sortable columns, right-aligned numerics      |
| `OrderTotals`        | Compact breakdown with a `display-lg` total                  |
| `PaymentPad`         | Amount due header, tender method, change readout, 44px commit |
| `Card`, `Dialog`, `Input`, `Select`, `EmptyState`, `PageHeader` | Inherit the tokens; not yet audited one by one |

Not yet built: status strip, receipt templates, offline banner.

## Interaction

- Keyboard first. Search is focused on load and after every sale; Escape
  clears the search, then the category filter.
- Focus is a 2px `primary` outline at 2px offset, everywhere a keyboard can
  land, including table headers and overlay panels. A bordered field thickens
  its own border to `primary` and adds a 2px primary wash instead, because an
  outline around a field reads as a second border.
- Motion is limited to colour and shadow transitions (150ms). Nothing moves
  layout, because a layout shift during a tender is a mis-click.

## Degraded states

The machine is a shop-floor computer: it loses power, network and printers.

- A missing database is a panel with a next step, not a toast.
- An empty list says why it is empty and what fills it.
- A failed write keeps the cart and offers Try again; it never clears the sale.

Offline trading is not implemented yet. When it lands, the status strip is
where it is announced, and the rule is that a degraded state never blocks the
till from taking money.

## Rollout

1. Tokens, fonts, chrome frame, control geometry. **Done.**
2. The till: hero total, single filled action, payment pad. **Done.**
3. Data surfaces: the orders and catalog tables are sticky, sortable and
   right-aligned. **Done.** Other data surfaces are audited one at a time.
4. Status strip and receipts (80mm thermal and A4). **Pending.**
5. Remaining screens audited one at a time; `DESIGN-stripe.md` deleted when
   nothing references it.

## Known gaps

These are product gaps, not styling gaps, and they are listed so the design
does not pretend to cover them:

- No shift or operator model, so no status strip yet.
- No printing, so no receipt templates.
- No roles or permissions, so no restricted actions.
- No offline queue.
- No dark mode. The chrome is dark; the work surface is intentionally not.
