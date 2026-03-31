# Trakovo — Claude Context

Fleet management platform for vehicle hire bookings, drivers, vendors, and dispatch.
Current version: **v1.8.0(c)**

---

## Stack

- **Framework:** Next.js 14 (App Router, `revalidate = 0` on data pages)
- **Database:** MySQL via raw `mysql2` — no Prisma ORM (removed in v1.3.0; Prisma's Rust binary panics on cPanel shared hosting)
- **Auth:** Custom JWT cookies — separate secrets for admin, vendor, driver (Web Crypto API — works in both Node.js and Edge runtimes)
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Hosting:** cPanel shared hosting (CloudLinux + Phusion Passenger)
- **Email:** Microsoft 365 Graph API (primary) with SMTP/Nodemailer fallback
- **Push:** Web Push (VAPID) via `web-push`
- **Key deps:** `mysql2`, `adm-zip`, `nodemailer`, `web-push`, `qrcode`, `date-fns`, `axios`

---

## Project structure

```
src/
  app/
    api/
      admin/          — admin API routes (auth-gated)
        bookings/     — booking CRUD, notes, status, send-quote, driver assign
        drivers/      — driver CRUD, password reset, messages
        users/        — additional admin user CRUD (master-only)
        vehicles/     — vehicle CRUD, next-id helper
        vendors/      — vendor CRUD, password reset, vehicle assignment
        settings/     — general settings, logo, email connections (MS/GC), push, QR, email preview/test
        update/       — OTA update: check, pull, upload, rollback
        login/logout/
        push/         — subscribe, test, vapid-key
        qr/           — QR code for booking app
    admin/            — admin portal pages
      bookings/       — list + detail (notes, status, driver assign, pricing, send-quote)
      calendar/       — calendar view of all bookings
      drivers/        — driver list, new, detail/edit
      users/          — additional admin user management
      vehicles/       — vehicle list, new, edit (media upload, day rates, POA pricing)
      vendors/        — vendor list, new, detail (tabs: info, bookings, vehicles, clients)
      settings/       — general, connections, templates, updates, booking-app (QR)
    api/
      vendor/         — vendor portal API routes
      driver/         — driver portal API routes
      booking/        — public booking submission + ID upload
      vehicles/       — public vehicle availability check
      logo/           — public logo endpoint
      uploads/        — serves uploaded files from UPLOAD_DIR
      maintenance-auth/ — bypass cookie for maintenance/dev mode
    vendor/           — vendor portal pages (dashboard, bookings, clients, calendar, support)
    driver/           — driver portal pages (dashboard, bookings, calendar, messages)
    book/             — public booking flow (vehicle list, per-vehicle booking form)
    vehicles/         — public fleet listing + detail pages
    confirmation/     — post-booking confirmation page
    maintenance/      — maintenance/dev mode lock page
    page.tsx          — homepage (redirects to /book or landing)
  components/
    admin/
      VehicleForm.tsx — shared vehicle create/edit form (media, day rates, POA)
    booking/
      BookingPanel.tsx       — full booking UI state machine
      Calendar.tsx           — date picker calendar
      ConfirmationUploadCard.tsx
      HireAgreementModal.tsx
    ui/
      CalendarView.tsx  — shared calendar grid used in admin/vendor/driver portals
      VehicleCard.tsx
      Nav.tsx / NavWrapper.tsx / Footer.tsx
  lib/
    db.ts             — mysql2 pool + query/queryOne/execute/newId/generatePublicId
    auth.ts           — admin JWT (create, verify, cookie helpers)
    vendor-auth.ts    — vendor JWT
    driver-auth.ts    — driver JWT (8-hour sessions, cookie: apex_driver_session)
    email.ts          — MS Graph (primary) + SMTP fallback, sendBookingNotification, sendCustomerQuote, sendTestEmail
    email-templates.ts     — template rendering with variable substitution + conditionals
    email-template-defaults.ts — default HTML for booking_notification and customer_quote templates
    calendar.ts       — Google Calendar OAuth helpers
    next-update.ts    — OTA update logic (adm-zip extract, backup, swap, Passenger restart)
    site.ts           — getSiteName, getAdminName, getDriverName, getLogoUrl (DB-backed with env fallback)
    push.ts           — web push helpers
    password.ts       — hashPassword / verifyPassword (bcrypt-equivalent)
    uploads.ts        — upload path helpers (uses UPLOAD_DIR env var)
    utils.ts          — formatCurrency, etc.
    api.ts            — shared fetch wrappers for client-side portal API calls
  middleware.ts       — JWT auth guard for /admin, /vendor, /driver; maintenance/dev mode redirect
  types/index.ts      — shared types (Vehicle, Booking, DayRate, HireType, TripLeg, BookingFormState, etc.)
prisma/
  init.sql            — full schema SQL for fresh installs (NOTE: out of sync — see below)
  schema.prisma       — kept for reference only, not used at runtime
```

---

## Database patterns (mysql2)

```typescript
// query returns Row[]
const rows = await query<{ id: string }>('SELECT id FROM Foo WHERE bar = ?', [val])

// queryOne returns T | null
const row = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM Foo', [])

// execute for INSERT/UPDATE/DELETE
await execute('UPDATE Foo SET name = ? WHERE id = ?', [name, id])

// newId() — crypto.randomUUID()
// generatePublicId('PRE') — 'PRE-XXXXXXXX'

// Upsert
await execute('INSERT INTO Setting (`key`, value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()', [key, val])

// IN clause
await query('SELECT * FROM Foo WHERE id IN (?)', [ids])

// Boolean conversion (mysql2 returns TINYINT as 0/1)
const isActive = Boolean(row.is_active)
```

---

## Database schema (complete — including tables missing from init.sql)

Tables in `prisma/init.sql` (deployed):
- `Vehicle` — id, public_id, slug, name, description, price, price_poa, chauffeur_price, chauffeur_price_poa, day_rates (TEXT/JSON), currency, hire_modes, passengers, transmission, fuel, is_available
- `VehicleMedia` — id, vehicle_id, url, content_type, sort_order
- `Booking` — id, public_id, vehicle_id, hire_type, service_type, status, start_date, end_date, total_days, daily_rate, total_cost, contact_name, contact_email, contact_phone, driver_name, driver_dob, driver_licence_number, driver_licence_expiry, agreement_accepted, id_document_path, licence_document_path, trip_details (JSON), is_enquiry, google_event_id, vendor_id, vendor_client_id
- `BookingNote` — id, booking_id, text, author, created_at
- `Setting` — key (PK), value, updated_at
- `PushSubscription` — id, endpoint, p256dh, auth, created_at
- `Vendor` — id, public_id, name, username, password_hash, contact_email, contact_phone, is_active
- `VendorVehicle` — id, vendor_id, vehicle_id, is_enabled
- `VendorClient` — id, public_id, vendor_id, name, email, phone, reference, notes, is_active
- `VendorEnquiry` — id, public_id, vendor_id, subject, message, booking_id, client_id, status, staff_reply

**⚠️ Tables/columns used in code but MISSING from init.sql (must be added manually via phpMyAdmin):**

```sql
-- Additional admin users (non-master logins)
CREATE TABLE `AdminUser` (
  `id` VARCHAR(191) NOT NULL,
  `username` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(191) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX `AdminUser_username_key` (`username`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Drivers (portal users / assignable to bookings)
CREATE TABLE `Driver` (
  `id` VARCHAR(191) NOT NULL,
  `public_id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `username` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL DEFAULT '',
  `phone` VARCHAR(191) NOT NULL DEFAULT '',
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL,
  UNIQUE INDEX `Driver_public_id_key` (`public_id`),
  UNIQUE INDEX `Driver_username_key` (`username`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Messages between admin and drivers
CREATE TABLE `DriverMessage` (
  `id` VARCHAR(191) NOT NULL,
  `driver_id` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `direction` VARCHAR(20) NOT NULL DEFAULT 'admin_to_driver',  -- 'admin_to_driver' | 'driver_to_admin'
  `status` VARCHAR(20) NOT NULL DEFAULT 'open',               -- 'open' | 'read'
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Booking.driver_id column (link booking to Driver)
ALTER TABLE `Booking` ADD COLUMN `driver_id` VARCHAR(191) NULL AFTER `vendor_client_id`;
```

---

## Key rules

- **No Prisma** — all DB access is raw SQL via `src/lib/db.ts`. Do not introduce Prisma.
- **No ORM** — write raw SQL using the query/queryOne/execute helpers.
- Schema changes: manually update `prisma/init.sql` AND apply via phpMyAdmin on the live server.
- The app does not run migrations automatically.
- Uploads live outside the app dir at `UPLOAD_DIR` (env var) — survives redeployments. Served at `/api/uploads/[...path]`.

---

## Authentication

Three separate JWT implementations using Web Crypto (no `jsonwebtoken` package — works on Edge runtime too):

| Portal | Cookie | Secret env var | Session duration |
|--------|--------|----------------|-----------------|
| Admin | `apex_admin_session` | `ADMIN_JWT_SECRET` | 12 hours |
| Vendor | `apex_vendor_session` | `VENDOR_JWT_SECRET` | 8 hours |
| Driver | `apex_driver_session` | `DRIVER_JWT_SECRET` | 8 hours |

Admin auth has two tiers:
1. **Master account** — credentials in env vars (`ADMIN_USERNAME`, `ADMIN_PASSWORD`). Can manage additional admin users. Cannot be deleted.
2. **Additional admin users** — stored in `AdminUser` table. Created/deleted by master only.

---

## Feature inventory

### Admin portal (`/admin`)
- **Dashboard** — overview stats
- **Bookings** — list with filters; detail page: status management, internal notes, pricing editor, send quote email to customer, assign driver, delete, view uploaded documents
- **Vehicles** — CRUD with image upload (multiple), day-rate pricing tiers, POA pricing flag, hire mode (chauffeured_only | both), vehicle specs
- **Drivers** — CRUD, password reset, messaging
- **Vendors** — CRUD, password reset, vehicle assignment, view bookings/clients per vendor
- **Admin Users** — master-only: add/remove additional admin logins (stored in `AdminUser` table)
- **Calendar** — calendar view of all bookings
- **Settings → General** — site name, admin name, driver portal name, notification email
- **Settings → Connections** — Google Calendar OAuth2, Microsoft 365 OAuth2, SMTP config, web push subscribe/test
- **Settings → Email Templates** — editable HTML templates for booking notifications and customer quotes
- **Settings → Booking App** — QR code generation (SVG) linking to `/book`
- **Settings → Updates** — OTA update system (see below)

### OTA Update system (`/admin/settings/updates`)
- Checks GitHub Releases API (`SpaceyPuppy/trakovo`) for latest version
- Can pull a `next-bundle-vX.X.X.zip` release asset directly from GitHub to server
- Manual zip upload fallback (for when server can't reach GitHub)
- Backs up current `.next` before swapping; one-click rollback
- Restarts Phusion Passenger via `touch tmp/restart.txt`
- Bundle format: zip containing `.next/` folder (with `BUILD_ID`) + optionally `package.json`
- Env var: `GITHUB_TOKEN` (optional, avoids rate limiting)

### Vendor portal (`/vendor`)
- Dashboard with booking stats
- Bookings — list + detail, create new booking
- Clients — CRM for vendor's clients
- Calendar — vendor's bookings calendar
- Support — submit/view enquiries to admin

### Driver portal (`/driver`)
- Dashboard — upcoming trips count, total assigned, open messages count
- Bookings — list + detail (view booking info, add notes)
- Calendar — driver's bookings calendar
- Messages — messaging thread with admin (open/read status)

### Public booking app (`/book`, `/vehicles`)
- Vehicle listing with availability check
- Per-vehicle booking page
- Booking form — chauffeured or dry-hire modes
  - Chauffeured: multi-leg trip schedule builder, passenger count, trip purpose
  - Dry-hire: driver details, under-25 alternate driver flow, hire agreement acceptance, ID/licence upload
- Enquiry fallback if dates are unavailable
- Mobile-optimised, QR-accessible
- Post-booking confirmation page with optional ID upload

### Email system
- **Primary:** Microsoft 365 via Graph API (OAuth2 tokens stored in `Setting` table, auto-refresh)
- **Fallback:** SMTP via Nodemailer
- Templates stored in DB (`Setting` table), editable in admin UI, with default fallbacks in code
- Template rendering: `{{variable}}` substitution + `{{#if condition}}...{{/if}}` conditionals
- Triggers: new booking notification (to admin), customer quote (to customer)
- Test email feature in admin settings

### Maintenance / Development mode
- Env vars: `MAINTENANCE_MODE=true` or `DEVELOPMENT_MODE=true`
- Middleware redirects all traffic to `/maintenance` page
- Cookie bypass (`maintenance_bypass=true`) allows authorised access
- Admin-accessible password bypass via `/maintenance` page form

---

## Env vars

```env
# Database
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=

# Admin auth
ADMIN_USERNAME=           # master admin username
ADMIN_PASSWORD=           # master admin password
ADMIN_JWT_SECRET=

# Portal auth
VENDOR_JWT_SECRET=
DRIVER_JWT_SECRET=

# Site config
NEXT_PUBLIC_SITE_URL=     # e.g. https://yourdomain.com
NEXT_PUBLIC_SITE_NAME=    # fallback if DB not set
NEXT_PUBLIC_ADMIN_NAME=   # fallback if DB not set

# Uploads
UPLOAD_DIR=               # absolute path outside app dir

# Email — SMTP (fallback)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_SECURE=false

# Email — Microsoft 365 (primary, set via admin UI OAuth flow)
MS_CLIENT_ID=
MS_CLIENT_SECRET=
MS_TENANT_ID=

# Google Calendar (set via admin UI OAuth flow)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# OTA updates
GITHUB_TOKEN=             # optional, prevents rate limiting on GitHub API

# Site lock
MAINTENANCE_MODE=false
DEVELOPMENT_MODE=false

# Cookies
COOKIE_SECURE=true        # set false for local dev (HTTP)
```

---

## Deployment

Short version:
1. `npm run build` locally
2. `powershell -ExecutionPolicy Bypass -File "make-zip.ps1"` — creates full release zip + `next-bundle-vX.X.X.zip` (for OTA upload)
3. Upload zip to cPanel, extract into app folder
4. cPanel → Setup Node.js App → Run NPM Install → Restart

Or use the OTA update system in admin → Settings → Updates to deploy without touching cPanel.

See `DEPLOYMENT-CPANEL.md` for full detail.

---

## Dev workflow

```bash
npm run dev          # local dev server
npm run build        # check for build errors before committing
git add .
git commit -m "..."
git push
```

Version in `package.json` — bump on meaningful releases (semver: MAJOR.MINOR.PATCH).

### After every git push / release — REQUIRED

After any `git push` or version release, always update both files:

**1. `CLAUDE.md`** — update the `Current version` line at the top to match `package.json`.

**2. `PENDING-DEPLOY.md`** — keep this in sync:
- If the push includes a new version bump: update the `## Current pending version` header to the new version and add a new `## vX.X.X — (unreleased)` changelog section.
- If the push is a production deployment (OTA or manual): clear all completed SQL/env/cron items and mark them as deployed, or reset the file if everything has been applied.
- Always ensure the pending SQL, env vars, cron jobs, and post-deploy checklist reflect only what is still outstanding on the production server.

---

## Versioning history

- **v1.4.x** — vehicle ID control, POA pricing, day-range rate tiers, chauffeur-only price fix, OTA update system (adm-zip, GitHub releases pull, rollback), driver portal, admin users, messaging, maintenance mode
- **v1.3.x** — Prisma → mysql2 migration, responsive admin sidebar, calendar views, vendor portals
- **v1.2.x** — early feature set

---

## Deployment tracking

`PENDING-DEPLOY.md` (project root) tracks everything that must be applied to the production server before the next release:
- All pending SQL (new tables, column changes)
- New env vars
- New cron jobs
- Post-deploy checklist
- Changelog / release notes for GitHub

**Always update `PENDING-DEPLOY.md` when a feature adds a DB table, env var, cron job, or significant change. Read it at the start of any deployment session.**

---

## Open TODOs / known gaps

### Schema not yet in init.sql
The following must be applied manually on any fresh install (see schema section above):
- `AdminUser` table
- `Driver` table
- `DriverMessage` table
- `Booking.driver_id` column

### Features not yet built
- **Admin password reset via email** — the master admin has no reset flow; password is env-var set. Intended: email auth/OTP flow to securely reset. (Noted as open TODO to prevent unauthorised resets.)
- **"Contact Us / POA" vehicle type** — premium vehicles that cannot be booked online; show a "contact us" CTA instead of booking form. (In TODO.md)
- **Contact Us page** (`/contact`) — general public enquiry form. (In TODO.md)
- **About page** (`/about`). (In TODO.md)
- **Homepage placeholder text** — editable via admin or content update needed. (In TODO.md)

### Partially complete / known rough edges
- `DriverMessage` table structure is inferred from code — exact column names should be verified against live DB before adding new queries
- Google Calendar integration exists (OAuth2 flow + event creation) but event sync is one-way (booking → GCal only; no read-back)
- Microsoft Calendar: OAuth2 connected but primary usage is email sending via Graph API; calendar write-back may not be wired
- Email templates are functional but the template editor UI is basic (raw HTML editing in textarea)
- Driver portal messaging is admin ↔ driver only; no push notifications for new driver messages
- Vendor support enquiry replies are admin-only; no email notification to vendor on reply
