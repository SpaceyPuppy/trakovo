# Trakovo v1.15.1

Emergency authentication hotfix for cPanel/Passenger deployments.

## Fixed

- Restored admin, vendor, and driver login sessions on shared hosts where the Edge runtime rejects `crypto.subtle.verify()` under constrained WebAssembly memory.
- Session verification now recomputes the HMAC using the previously compatible signing path and compares signatures in constant time.
- Fixed case-sensitive WebAssembly error detection in `app.js`, preventing the intended shared-host fallback from terminating Passenger when the host reports `Wasm memory` with a capital letter.

## Deployment

- No SQL, environment-variable, dependency, or cron changes are required.
- Because the affected admin cannot access OTA updates, manually replace `.next` from the release bundle and replace the root `app.js`, then restart Passenger.
- Preserve both the broken v1.15.0 build and the existing `.next.backup` until login and core smoke tests pass.
