# Store Console

A modern rewrite of the [Store-management](https://github.com/drilonsaiti/Store-management) POS/inventory app — Next.js
14 (App Router) + TypeScript + Tailwind + shadcn-style UI, reading/writing the **same** Firebase Realtime Database your
current app uses.

## 1. Setup

```bash
npm install
cp .env.local.example .env.local   # fill in your Firebase web config (see below)
npm run dev                        # http://localhost:3000
```

Other scripts:

```bash
npm run typecheck   # tsc --noEmit
npm run lint         # next lint
npm test             # vitest run
npm run build         # production build
```

### Firebase config

Get these from Firebase Console → Project settings → General → "Your apps" → Web app config. The database URL is already
filled in to point at your existing `store-f5372` instance — only the other keys are missing:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

These are all client-safe values (not secrets) — Firebase web apps are protected by **Realtime Database security
rules**, not by hiding the config. Your current database has no auth in front of it. At minimum, before going live, set
rules like:

```json
{
  "rules": {
    "products": {
      ".read": true,
      ".write": "auth != null"
    },
    "sale": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

This keeps products publicly readable (so the POS can look items up) but requires a signed-in user to write — pairs with
the auth scaffolding described in §6 below.

## 2. Data compatibility — nothing was destroyed or migrated

This app reads and writes the **existing** `/products` and `/sale` nodes, no migration needed:

- `src/lib/firebase/products.ts` normalizes `barCode` to a string on every read, so old records saved as a `number`
  (leading zeroes already lost) or as a `string` both work. All new writes always store `barCode` as a string.
- Sales are read/written in the same shape your old app used (`{ date, products: [...], totalPrice }`), with one
  addition: a `totalQuantity` field is now also stored to avoid recomputing it from `products.length` on every dashboard
  load. Older sale records without it will just show `0` items in that one column — everything else about them still
  renders correctly.

## 3. What changed vs. the original app (and why)

| Old                           | New                                                                 | Why                                                                                                                                                                                    |
|-------------------------------|---------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Redux + Redux Thunk           | TanStack Query (server data) + Zustand (cart)                       | The old app's Redux store only ever held *fetched* products/sales — the in-progress cart already lived in local component state. This makes that split explicit instead of accidental. |
| Axios → `/products.json` REST | Firebase JS SDK (`lib/firebase/`)                                   | Typed, no manual URL building, real-time-ready if you want it later.                                                                                                                   |
| React Router                  | Next.js App Router                                                  | File-based routes, layouts, no client bundle for routing.                                                                                                                              |
| Material UI                   | Tailwind + local shadcn-style primitives (`src/components/ui`)      | No new dependency on a component library at this scale; full control over the "register display" visual style.                                                                         |
| Quagga (EAN only)             | Native `BarcodeDetector` API, lazy-loaded `@zxing/browser` fallback | Faster where supported (mainly Chrome/Android), still works on Safari/iOS via the fallback. Supports EAN-13/8, UPC-A/E, Code128/39.                                                    |
| Barcode stored as `number`    | Always `string`                                                     | The #1 real bug in the original: `0123456789012` silently became `123456789012`. Covered by a unit test.                                                                               |
| No hardware scanner support   | `useHardwareBarcodeScanner`                                         | USB/Bluetooth scanners act like a fast keyboard + Enter — the hook detects the speed pattern and never interferes with normal typing.                                                  |
| Orders / `containers/Orders`  | Removed                                                             | Dead/commented-out code in the original repo — nothing was using it.                                                                                                                   |

## 4. Architecture map

```
src/
  app/            routes (dashboard, products, sale, sales, settings)
  components/
    ui/           local button/card/input/dialog/etc primitives
    layout/       sidebar, mobile bottom-nav, topbar, app shell
    products/     table, mobile cards, form, search, stock badge
    pos/          the whole POS screen: cart, checkout, not-found recovery
    scanner/      the full-screen camera scanner dialog
    dashboard/    KPI cards
  hooks/          use-products, use-sales (TanStack Query), the two scanner hooks
  stores/         cart-store.ts (Zustand)
  lib/
    firebase/     client.ts, products.ts, sales.ts — the ONLY place Firebase is called
    utils/        currency (integer-cent math), dates, barcode, sound/vibration feedback
    validation/   Zod product schema
  types/          Product, Sale, CartItem, StockStatus
```

Components never call Firebase directly — everything goes through `lib/firebase/*` via the hooks in `hooks/`.

## 5. Testing what's here

`npm test` covers the cart math (increment-on-rescan, decrement-to-removal, integer-cent totals) and barcode
normalization (the leading-zero case specifically). This is a starting set, not full coverage — see §7.

Manually verify with the acceptance flow from the original spec: open `/sale`, scan a known EAN-13, scan it again
(quantity → 2), scan a second product, adjust quantity, remove a line, complete the sale, confirm it shows up in
`/sales`, confirm `/products` quantities are untouched (this app does **not** auto-decrement stock on sale — neither did
the original; see §7 if you want that added).

## 6. Authentication (not implemented — structured for it)

No auth exists yet, matching the original. `lib/firebase/client.ts` only sets up the Realtime Database; adding
`getAuth()` alongside it and a `useAuth()` hook mirroring
`use-products.ts` would be a small, isolated addition. Do this **before** tightening the security rules in §1, or the
app will lose write access.

## 7. Deliberately not built in this pass

Scoped out to keep this a working, testable app rather than a sprawling one:

- **Offline / PWA sync** — `manifest.json` and icon exist; no service worker or Firebase offline persistence yet.
  Structured so `lib/firebase/` is the only place that would need to change.
- **Stock auto-decrement on sale** — preserved the original's behavior of treating stock counts as manually managed.
  Would be a small addition to `useCreateSale`.
- **Configurable low-stock threshold in Settings UI** — currently a constant (`LOW_STOCK_THRESHOLD` in
  `src/types/product.ts`); Settings page explains where to change it.
- **Full test coverage** of every item in the original spec's §41 (only cart/barcode/currency are covered).
- **Inline desktop scanner panel** — the spec's desktop wireframe shows the camera embedded next to the cart at all
  times; this build uses the same full-screen scanner dialog on both desktop and mobile, opened via the "Scan barcode"
  button, to avoid running the camera when it's not actively needed.

## 8. Scanner behavior: one tap, then keep scanning

The camera scanner **stays open across multiple detections** — it does not close after each item. Tap "Scan barcode"
once, then scan the whole basket; each hit shows a toast over the viewfinder ("Coca-Cola added" / "Not found: 123…")plus
a running item count and total pinned to the bottom of the camera view, so the cashier gets confirmation without ever
leaving the scan screen. It only closes on the X, Escape, or the "Done scanning" button. A hardware USB/Bluetooth
scanner never needed this fix — it was already always listening whenever the scanner dialog and checkout dialog are both
closed.