# Trakovo

Fleet management platform for bookings, vehicles, drivers, vendors, dispatch, and native billing.

Built with Next.js 14 (App Router), MySQL via `mysql2`, and Tailwind CSS.

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

Before starting a build that changes the database, apply the version-specific SQL in
`PENDING-DEPLOY.md`. The application deliberately does not run migrations automatically.

## Documentation

- `DEPLOYMENT-CPANEL.md` — full cPanel and OTA deployment/rollback procedure
- `PENDING-DEPLOY.md` — version-specific SQL, configuration, and post-deploy checks
- `BILLING-MVP.md` — billing workflow, business rules, API behaviour, and acceptance checks
- `DOCUMENTATION-DEBT.md` — known documentation and repository-hygiene debt
- `RELEASE-NOTES-v1.15.0.md` — curated v1.15.0 changes and deployment warning
