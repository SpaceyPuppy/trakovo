# Trakovo

Fleet management platform — bookings, vehicles, drivers, vendors, and dispatch.

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
npm install
cp .env.example .env.local   # fill in your values
npm run dev
```

## Portals

| Portal | URL | Description |
|--------|-----|-------------|
| Admin | `/admin` | Full fleet management, bookings, drivers, vendors, settings |
| Vendor | `/vendor` | B2B booking portal for fleet operators |
| Driver | `/driver` | Assignment view for drivers |
| Booking App | `/book` | Public-facing PWA booking flow |

## Building & deploying

```bash
npm run build
powershell -ExecutionPolicy Bypass -File "make-zip.ps1"
# Upload trakovo-vX.X.X.zip to cPanel, or use OTA update via Admin → Settings → Updates
```

See `DEPLOYMENT-CPANEL.md` for full deployment detail.
