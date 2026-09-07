# Security Policy

## Supported versions

This project doesn't yet maintain multiple release branches — security fixes are applied to the latest version on `main`.

## Reporting a vulnerability

If you find a security issue, **please do not open a public GitHub issue**. Instead:

- Use GitHub's [private vulnerability reporting](../../security/advisories/new) for this repository, or
- Email the maintainer directly (add your contact email here)

Please include:
- a description of the vulnerability and its potential impact
- steps to reproduce it
- any relevant logs or screenshots

We'll acknowledge reports within a few days and keep you updated as a fix is worked on.

## Known, accepted trade-offs

These are documented design decisions, not bugs — please don't file reports for the following unless you've found a way to escalate them beyond what's described:

- **Employee PIN selection** (`src/components/settings/employee-pin-dialog.tsx`) is a lightweight deterrent for attributing a sale to the correct staff member, checked client-side. It is explicitly **not** a substitute for real account authentication.
- **Held sales** are stored in `localStorage`, unencrypted, device-local — by design, since they're transient mid-transaction state, not committed records.
- **Firebase configuration values** (`NEXT_PUBLIC_FIREBASE_*`) are intentionally public, per Firebase's own security model — actual access control lives in your Realtime Database security rules, not in keeping these values secret.

## A note for anyone deploying this

This app ships **without** production-hardened Firebase security rules by default. Before deploying with real data:

1. Enable Authentication and disable/restrict public sign-up.
2. Apply an allowlist-based security rule set — see the README's [Security rules](../README.md#security-rules-required-before-production-use) section.
3. Confirm your Realtime Database rules require `auth != null` **and** UID allowlist membership for every read and write, not just some paths.

Running this with default or overly permissive rules means anyone with your database URL — which is not secret — can read and write your entire dataset.
