# Trakovo

Fleet management platform for bookings, vehicles, drivers, vendors, dispatch, and native billing.

Built with Next.js 14 (App Router), MySQL via `mysql2`, and Tailwind CSS.

Production is currently v1.14.4. This checkout is v1.15.0, pending its production SQL and
deployment. See [`docs/PRODUCT-STATUS.md`](docs/PRODUCT-STATUS.md) for the capability and
release-state distinction.

## Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** MySQL — raw `mysql2`, no ORM
- **Auth:** Custom JWT (Web Crypto API) — separate cookies for admin, vendor, driver portals
- **Email:** Microsoft 365 Graph API with SMTP/Nodemailer fallback
- **Calendar:** Microsoft 365 Outlook Calendar via Graph API
- **Push:** Web Push (VAPID)
- **SMS:** CrazyTel API
- **Styling:** Tailwind CSS
- **Hosting:** cPanel shared hosting (CloudLinux + Phusion Passenger)

## Getting started

```bash
npm ci
cp .env.example .env.local   # fill in your values
npm run dev
```

## Portals

| Portal | URL | Description |
|--------|-----|-------------|
| Admin | `/admin` | Fleet management, bookings, billing, drivers, vendors, and settings |
| Vendor | `/vendor` | B2B booking portal for fleet operators |
| Driver | `/driver` | Assignment view for drivers |
| Booking App | `/book` | Public-facing PWA booking flow |

## Building & deploying

```bash
npm run build
powershell -ExecutionPolicy Bypass -File "make-zip.ps1"
# Upload trakovo-vX.X.X.zip to cPanel, or use OTA update via Admin → Settings → Updates
```

Before deploying a build that changes the database, follow the version-specific SQL and
ordering in `PENDING-DEPLOY.md`. The application deliberately does not run migrations
automatically.

## Documentation

- [`docs/PRODUCT-STATUS.md`](docs/PRODUCT-STATUS.md) — live, source-ready, partial, and planned capability
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — canonical current technical architecture
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — canonical release and deployment overview
- [`DEPLOYMENT-CPANEL.md`](DEPLOYMENT-CPANEL.md) — detailed cPanel and OTA procedure
- [`PENDING-DEPLOY.md`](PENDING-DEPLOY.md) — only the outstanding release-specific production actions
- [`BILLING-MVP.md`](BILLING-MVP.md) — billing workflow, rules, API behaviour, and acceptance checks
- [`TODO.md`](TODO.md) — actionable product backlog
- [`DOCUMENTATION-DEBT.md`](DOCUMENTATION-DEBT.md) — documentation and repository-hygiene risks
- [`docs/archive/README.md`](docs/archive/README.md) — historical plans and superseded specifications
- [`RELEASE-NOTES-v1.15.0.md`](RELEASE-NOTES-v1.15.0.md) — v1.15.0 changes and deployment warning
