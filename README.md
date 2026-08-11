# 🛒 Store Console

**A modern, offline-capable point-of-sale and inventory system for small retail — built with Next.js, TypeScript, and Firebase.**

Store Console is a complete rewrite of a legacy Create React App / Redux POS system into a fast, mobile-first, installable web app. It keeps the same Firebase Realtime Database your data already lives in, but replaces the architecture, UI, and barcode-scanning experience end to end.

---

## ✨ Features

### Point of sale
- **Camera barcode scanning** — native `BarcodeDetector` API with a lazy-loaded ZXing fallback for browsers that don't support it (Safari/iOS). Frames are cropped and detected at high resolution for reliable reads on small or worn barcodes.
- **Hardware USB/Bluetooth scanner support** — detected automatically via keystroke timing; never interferes with normal typing.
- **Stays open across scans** — ring up an entire basket without reopening the scanner between items. A running total and last-scanned item stay visible the whole time.
- **Sell by piece, weight, or package** — a product can be configured to sell by the piece, by weight (kg/g) with a price-per-unit, or as a discounted full package alongside individual pieces.
- **Held / parked sales** — suspend the current cart to serve another customer, then resume it later.
- **Unknown barcode?** Add the product on the spot, without leaving the sale.
- **Offline-safe checkout** — no connection at the register? The sale is queued locally and synced automatically the moment connectivity returns, with no duplicate writes.
- **Receipt printing** — a dedicated print view auto-opens the browser print dialog, formatted for narrow thermal-printer paper.
- **Fuzzy, accent-insensitive search** — "eks 250" finds "Eks Pjeshkë 250 ml"; typing `e` still matches `ë`, and look-alike Cyrillic characters are normalized to Latin.

### Inventory
- Full product CRUD with barcodes always stored as text (leading zeroes are never lost).
- CSV import/export, including weight and package pricing columns.
- Configurable low-stock threshold, reflected consistently across Products, POS, and the dashboard.
- Search-by-scan on the products list.

### Sales & reporting
- Full sales history with search, date filtering, and infinite scroll.
- **Refunds** — full or partial, per line item, with automatic stock restocking via atomic Firebase transactions.
- **End-of-day report**, broken down by employee, with a printable summary.
- CSV export of sales for accounting.

### Team
- Manage employees and mark who's currently on the register from the top bar.
- Optional **4-digit PIN** per employee so the wrong person can't be selected by mistake.

### Everything else
- **Dashboard** with KPIs, a 14-day revenue chart, and a top-products chart (both lazy-loaded to keep initial load fast).
- **Multi-currency** — EUR, USD, GBP, CHF, or ALL, chosen once in Settings and reflected everywhere money is shown.
- **Authentication** via Firebase Auth, gating every screen.
- **Installable PWA** with a minimal service worker for shell caching and offline resilience.
- **Dark mode**, full keyboard shortcuts (`⌘K` search, `F4` scan, `⌘⏎` checkout), and accessibility basics (skip link, live regions, reduced-motion support, semantic nav).

---

## 🧱 Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript (strict) |
| Styling | Tailwind CSS + local shadcn-style primitives |
| Server state | TanStack Query, persisted to `localStorage` |
| Client state | Zustand (cart), React Context (auth) |
| Forms & validation | React Hook Form + Zod |
| Data | Firebase Realtime Database + Firebase Authentication |
| Barcode scanning | Native `BarcodeDetector` API, ZXing fallback |
| Charts | Recharts (lazy-loaded) |
| Testing | Vitest + Testing Library |

---

## 🚀 Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in your Firebase config, see below
npm run dev                        # http://localhost:3000
```

Other scripts:

```bash
npm run typecheck   # tsc --noEmit
npm run lint         # next lint
npm test             # vitest run
npm run build         # production build
```

### Firebase setup

1. **Realtime Database** (not Firestore) — this app is built entirely on `firebase/database`. Create one in Firebase Console → Build → Realtime Database if you haven't already.
2. **Authentication** — enable the Email/Password provider under Build → Authentication, then use the "Create one" link on `/login` to make your first account. Turn public sign-up back off once your team has accounts (see `src/app/login/page.tsx`).
3. Copy your web app config into `.env.local`:

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=


4. **Security rules** — tighten these once accounts exist, or the database stays publicly writable:

```json
{
  "rules": {
    "products": { ".read": "auth != null", ".write": "auth != null" },
    "sale":     { ".read": "auth != null", ".write": "auth != null" },
    "employees": { ".read": "auth != null", ".write": "auth != null" }
  }
}
```

---

## 🗂️ Project structure

src/
app/ routes: dashboard, products, sale, sales, settings,
reports, print views, login
components/
ui/ local button/card/input/dialog/table primitives
layout/ sidebar, mobile nav, topbar, offline banner
pos/ the entire POS experience: cart, checkout,
held sales, quick-add, weight/package picker
scanner/ the camera scanner dialog
products/ table, cards, form, import dialog
sales/ sales table, refund dialog
dashboard/ KPI cards, charts
settings/ employee management, PIN entry
auth/ auth provider + route guard
pwa/ service worker registration
hooks/ one hook per concern — products, sales, employees,
cart-adjacent state, currency, threshold, offline
queue, debouncing, infinite scroll, camera permission
lib/
firebase/ client.ts, products.ts, sales.ts, employees.ts,
auth.ts — the ONLY place Firebase is ever called
utils/ currency, dates, barcode, search (fuzzy matching),
analytics, csv, feedback (sound/vibration)
offline/ localStorage-backed offline sale queue
pos/ held-sales storage
validation/ Zod schemas
stores/ cart-store.ts (Zustand)
types/ Product, Sale, CartItem, Employee, ...


Components never call Firebase directly — everything routes through `lib/firebase/*` via the hooks in `hooks/`.

---

## 🧪 Testing

```bash
npm test
```

Covers cart math (increment-on-rescan, weight amounts, package lines), barcode normalization (the leading-zero case specifically), currency arithmetic, CSV round-tripping, the offline sale queue, the low-stock threshold hook, and the hardware barcode scanner's keystroke-timing logic.

---

## 📴 Offline behavior

- A sale completed with no connection is saved to `localStorage` instead of failing, and syncs automatically — one item at a time, only removed from the queue after a confirmed write — the moment the browser comes back online.
- Product and sale data is cached locally too, so the POS still has last-known inventory to look up against right after a reload with no connection.
- A banner appears in the app shell whenever you're offline or a sync is in progress; it's silent otherwise.

---

## 🔒 A few things worth knowing

- **Employee selection is attribution, not authentication.** It tags a sale with whoever's picked in the topbar for reporting purposes. The optional PIN is a light deterrent against picking the wrong name, not real account security — anyone with database access can see it in plain text.
- **Camera permission persistence is entirely the browser's job.** Once granted, Chrome/Edge/Firefox remember it forever for a fixed, secure origin. If it keeps re-prompting, you're likely testing at a changing address (a LAN IP, or mixing `localhost`/`127.0.0.1`) — deploy behind one fixed HTTPS domain to fix it for good.
- **Held sales are device-local**, not synced to Firebase — they're mid-transaction scratch state, not committed sales, so a hold on the front register won't appear on another device.

---

## 🗺️ Not yet built

- Server-side pagination (Products/Sales currently fetch the full dataset once and paginate client-side — fine at small-to-medium store scale, but would need reworking for very large catalogs).
- Cross-device held sales.
- A full accessibility audit with a screen reader (current coverage is markup-level: semantic landmarks, live regions, focus management, reduced motion).

---

Built as an iterative rewrite of a legacy CRA/Redux/Quagga POS, preserving the original Firebase data model throughout.