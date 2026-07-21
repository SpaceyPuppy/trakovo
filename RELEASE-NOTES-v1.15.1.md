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

> [!IMPORTANT]
> **cPanel/Passenger installations must verify the root `app.js` manually.** The
> `next-bundle-v1.15.1.zip` OTA archive contains `.next` and `package.json`, but it
> does not contain `app.js`. Existing installations must copy `app.js` from the
> full v1.15.1 archive or the v1.15.1 source tag. If the file is missing, create it
> from that release rather than using a generic Next.js startup file. The supplied
> file uses Passenger's `PORT`, starts Next.js in production mode, and performs a
> case-insensitive `wasm memory` check so the shared-host fallback does not terminate
> the application.

After a manual upload, restore executable directory permissions before restarting:

```bash
find .next -type d -exec chmod 755 {} \;
find .next -type f -exec chmod 644 {} \;
chmod 644 app.js package.json
touch tmp/restart.txt
```
