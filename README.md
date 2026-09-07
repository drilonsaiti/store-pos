<div align="center">

# 🛒 Store Console

**A modern, offline-capable point-of-sale and inventory system for small retail.**

Built with Next.js, TypeScript, and Firebase — a complete rewrite of a legacy CRA/Redux/Quagga POS into a fast, mobile-first, installable web app.

[![CI](https://github.com/drilonsaiti/store-pos/actions/workflows/ci.yml/badge.svg)](https://github.com/drilonsaiti/store-pos/actions/workflows/ci.yml) 
[![CodeQL](https://github.com/drilonsaiti/store-pos/actions/workflows/codeql.yml/badge.svg)](https://github.com/drilonsaiti/store-pos/actions/workflows/codeql.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16.3.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime%20Database-ffca28?logo=firebase)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Features](#-features) • [Getting started](#-getting-started) • [Architecture](#-architecture) • [Contributing](#-contributing) • [Roadmap](#-roadmap)

</div>

---

## Why Store Console

Most small-store POS tools are either expensive SaaS subscriptions or clunky legacy software. Store Console is neither: it's a self-hostable, open-source point-of-sale you run on your own Firebase project, with the barcode-scanning speed, offline resilience, and receipt printing a real cashier needs — and none of the enterprise-retail bloat you don't.

> **Note on data layer:** this app uses Firebase **Realtime Database**, not Firestore. If you're evaluating it for your stack, that distinction matters — see [Firebase setup](#firebase-setup) below.

---

## ✨ Features

### Point of sale
- 📷 **Camera barcode scanning** — native `BarcodeDetector` API with a lazy-loaded [ZXing](https://github.com/zxing-js/library) fallback for Safari/iOS, plus a selectable [zbar-wasm](https://github.com/undecaf/zbar-wasm) engine for barcodes other engines struggle with. Frame cropping, digital zoom, and continuous autofocus specifically target small, worn, or curved-surface barcodes.
- ⌨️ **Hardware USB/Bluetooth scanner support**, detected automatically via keystroke timing — no drivers, no configuration.
- 🔄 **Scan-and-keep-scanning UX** — the camera stays open across an entire basket instead of closing after every item.
- ⚖️ **Sell by piece, weight (kg/g), or package** — the same product can be priced per unit and per bulk package independently.
- ⏸️ **Held / parked sales** — suspend a cart to serve another customer, resume it later.
- 💵 **Cash received / change due**, calculated and printed on the receipt.
- ❓ **Unknown barcode?** Add the product on the spot without leaving the sale.
- 📴 **Offline-safe checkout** — a sale placed with no connection queues locally and syncs automatically, with no duplicate writes, the moment connectivity returns.
- 🧾 **Receipt printing**, formatted for thermal-printer-width paper.
- 🔍 **Fuzzy, accent- and script-insensitive search** — `pjeshke` finds `Pjeshkë`, and look-alike Cyrillic characters normalize to Latin.

### Inventory
- Full product CRUD, with barcodes always stored as text — leading zeroes are never silently dropped.
- **Restock by scan** — scan a product, enter how much arrived, it's added on top of current stock (never overwritten), with an undo log.
- CSV import/export, including weight and package pricing columns.
- Configurable low-stock threshold, reflected consistently everywhere stock status is shown.
- Infinite-scroll product/sales lists with debounced search.

### Sales & reporting
- Full sales history with search, date filtering, and CSV export.
- **Refunds** — full or partial, per line item, with automatic stock restocking via atomic transactions.
- **End-of-day report**, broken down by employee, with a printable summary.

### Team
- Manage employees, and select who's currently on the register from the top bar.
- Optional 4-digit PIN per employee — a lightweight deterrent against attributing a sale to the wrong person (not intended as real account security; see [Security](#-security)).

### Platform
- 🔐 Authentication via Firebase Auth, gating every screen.
- 💱 **Multi-currency** — pick a currency once in Settings, every displayed amount follows it.
- 📊 Dashboard with KPIs, a 14-day revenue chart, and a top-products chart.
- 📲 Installable PWA with offline shell caching.
- 🌗 Dark mode, full keyboard shortcuts, and accessibility basics (skip link, live regions, reduced-motion support).

---

## 🧱 Tech stack

| Layer | Choice |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) + TypeScript (strict) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) + local shadcn/ui-style primitives |
| Server state | [TanStack Query](https://tanstack.com/query), persisted to `localStorage` |
| Client state | [Zustand](https://github.com/pmndrs/zustand) (cart), React Context (auth) |
| Forms & validation | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| Data & auth | [Firebase Realtime Database](https://firebase.google.com/docs/database) + Firebase Authentication |
| Barcode scanning | Native `BarcodeDetector`, [ZXing](https://github.com/zxing-js/library), [zbar-wasm](https://github.com/undecaf/zbar-wasm) |
| Charts | [Recharts](https://recharts.org/) (lazy-loaded) |
| Testing | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) |

---

## 🚀 Getting started

### Prerequisites
- Node.js 18+
- A [Firebase](https://console.firebase.google.com/) project with **Realtime Database** and **Authentication** (Email/Password) enabled

### Install

```bash
git clone https://github.com/drilonsaiti/store-pos
cd store-console
npm install
cp .env.local.example .env.local   # fill in your Firebase config — see below
npm run dev                        # http://localhost:3000
```

### Firebase setup

1. Firebase Console → Build → **Realtime Database** → Create Database (not Firestore).
2. Firebase Console → Build → **Authentication** → enable the Email/Password provider.
3. Copy your web app config into `.env.local`:

   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
   NEXT_PUBLIC_FIREBASE_APP_ID=
   ```

4. Use the "Create one" link on `/login` to make your first account, then **lock down public sign-up** and apply the security rules below before going live.

### Security rules (required before production use)

Firebase's client API key is not a secret, which means anyone can call the sign-up API directly against your project. Don't rely on `auth != null` alone — allowlist by UID:

```json
{
  "rules": {
    "staff": { ".read": false, "$uid": { ".write": false } },
    "products": {
      ".read": "auth != null && root.child('staff').child(auth.uid).exists()",
      ".write": "auth != null && root.child('staff').child(auth.uid).exists()"
    },
    "sale": {
      ".read": "auth != null && root.child('staff').child(auth.uid).exists()",
      ".write": "auth != null && root.child('staff').child(auth.uid).exists()"
    },
    "employees": {
      ".read": "auth != null && root.child('staff').child(auth.uid).exists()",
      ".write": "auth != null && root.child('staff').child(auth.uid).exists()"
    }
  }
}
```

After someone signs up, they have **zero** access until you manually add their UID under `staff/` in the Firebase Console.

### Scripts

```bash
npm run dev         # start the dev server
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint          # eslint .
npm test              # vitest run
```

---

## 🗂️ Architecture

```
src/
  app/                  routes: dashboard, products, sale (POS), sales,
                         settings, reports, print views, login
  components/
    ui/                 local button/card/input/dialog/table primitives
    layout/              sidebar, mobile nav, topbar, offline banner
    pos/                  cart, checkout, held sales, quick-add,
                          weight/package picker
    scanner/              camera scanner dialog + engine switching
    products/             table, cards, form, import dialog, restock
    sales/                sales table, refund dialog
    dashboard/            KPI cards, charts
    settings/             employee management, PIN entry
    auth/                 auth provider + route guard
  hooks/                 one hook per concern (products, sales, employees,
                         currency, low-stock threshold, offline queue,
                         debouncing, infinite scroll, camera permission)
  lib/
    firebase/             client.ts, products.ts, sales.ts, employees.ts,
                          auth.ts — the ONLY place Firebase is ever called
    scanner/               pluggable barcode-decode engines
    utils/                  currency, dates, barcode, fuzzy search,
                          analytics, csv, sound/vibration feedback
    offline/               localStorage-backed offline sale queue
    pos/                   held-sales storage
    validation/             Zod schemas
  stores/                 cart-store.ts (Zustand)
  types/                  Product, Sale, CartItem, Employee, ...
```

**Design principle:** components never call Firebase directly. Every read/write goes through `lib/firebase/*`, accessed via the hooks in `hooks/`. If you're looking for where a piece of data actually gets fetched or saved, start there.

---

## 🧪 Testing

```bash
npm test
```

Coverage focuses on the logic most worth protecting from regressions: cart math (increment-on-rescan, weight amounts, package lines), barcode normalization (the classic leading-zero bug, specifically), currency arithmetic, CSV round-tripping, the offline sale queue, the low-stock threshold hook, and hardware-scanner keystroke-timing detection.

---

## 📴 Offline behavior

- A sale completed with no connection is saved to `localStorage` and synced automatically — one item at a time, removed from the queue only after a confirmed Firebase write — the moment the browser reconnects.
- Product and sale data is cached locally too, so the POS still has last-known inventory to check against immediately after a reload with no connection.
- A banner in the app shell shows offline/syncing state; it's silent otherwise.

---

## 🔒 Security

- **Employee PIN selection is attribution, not authentication.** It tags a sale with whoever's picked in the top bar for reporting — the PIN discourages picking the wrong name, it does not protect against a determined bad actor with access to the browser.
- **Camera permission persistence is entirely the browser's job**, scoped per fixed, secure origin — deploy behind one stable HTTPS domain, or Chrome/Firefox will treat every changed address as a new site and re-prompt.
- Found a real vulnerability? Please open a private security advisory rather than a public issue — see [SECURITY.md](SECURITY.md).

---

## 🗺️ Roadmap

- [ ] Server-side pagination for very large catalogs (current implementation fetches the full product/sale list once, which is fine at small-to-medium store scale)
- [ ] Cross-device held sales (currently device-local by design)
- [ ] Full screen-reader audit (current coverage is markup-level: landmarks, live regions, focus management)
- [ ] Invoice-photo-to-inventory import (OCR/vision-based line-item extraction) — designed, not yet implemented

Have an idea? [Open an issue](../../issues) or start a [discussion](../../discussions).

---

## 🤝 Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for setup, coding conventions, and how to submit a pull request. Please run `npm run typecheck`, `npm run lint`, and `npm test` before opening a PR.

---

## 📄 License

Licensed under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

Built as an iterative rewrite of a legacy Create React App + Redux + Quagga point-of-sale system, preserving the original Firebase data model throughout the migration.
