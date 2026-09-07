# Contributing to Store Console

Thanks for considering a contribution — this project welcomes issues, discussions, and pull requests.

## Getting set up

```bash
git clone https://github.com/drilonsaiti/store-pos
cd store-console
npm install
cp .env.local.example .env.local   # your own Firebase project — see README
npm run dev
```

You'll need your own Firebase project (Realtime Database + Authentication) to run the app locally — there's no shared dev environment.

## Before opening a pull request

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

All four should pass. If you're changing behavior around money (cart totals, refunds, cash/change) or stock (restock, sale creation), please add or update a test in the relevant `__tests__` folder — these are the paths where a silent regression is most costly.

## Code conventions

- **TypeScript strict mode, no `any`** unless genuinely unavoidable — explain why in a comment if you do.
- **Barcodes and other numeric-looking identifiers are always strings.** Never coerce a barcode to a number — see `src/lib/utils/barcode.ts` for why this matters.
- **Money math uses integer cents**, never raw floats — see `src/lib/utils/currency.ts`.
- **Components never call Firebase directly.** All reads/writes go through `src/lib/firebase/*`, exposed via hooks in `src/hooks/`.
- **Every mutation that can fail offline or fail partway should fail safely** — see `src/lib/offline/sale-queue.ts` for the pattern (single-flight guard, dequeue only after confirmed write).

## Commit style

Clear, present-tense commit messages (`Fix barcode leading-zero bug`, not `fixed bug`). Squash noisy work-in-progress commits before opening a PR where practical.

## Reporting bugs

Open an issue with:
- what you expected vs. what happened
- browser/device, since a lot of this app's surface area (camera scanning, hardware scanner detection, PWA install) is genuinely device-dependent
- steps to reproduce

## Reporting security issues

Please don't open a public issue for a security vulnerability — see [SECURITY.md](SECURITY.md).

## Feature requests

Open a [discussion](../../discussions) first for anything non-trivial — it's easier to agree on scope before code exists than to revise a finished PR.
