# Pending Production Deployment

This file tracks everything that must be done on the production server before the next release.
Update it as features are built. Clear it after each successful production deployment.

---

## Current pending version: v1.7.0

---

## 1. Database — run via phpMyAdmin

✅ All DB migrations up to and including v1.7.0 have been applied on production.

---

## 2. Environment variables — add to `.env` on server

```env
# Cron authentication (for /api/cron/email-sequences)
CRON_SECRET=generate_a_long_random_string_here

# Mapbox (for /book taxi flow — v1.7.0)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey...your_token_here
```

## 2b. npm install on server (v1.7.0)

New packages were added. After deploying the zip, run npm install via cPanel Node.js App setup:
```
npm install
```
New dependencies: `react-map-gl`, `mapbox-gl`, `@types/mapbox-gl`

---

## 3. Cron jobs — set up in cPanel Cron Jobs

```
# Daily email sequences (24hr reminders + post-trip follow-ups) — 7am AEST
0 7 * * * curl -s -X POST https://yourdomain.com/api/cron/email-sequences -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Replace `yourdomain.com` and `YOUR_CRON_SECRET` with actual values.

---

## 4. Code deployment — OTA zip or manual upload

Deploy via Admin → Settings → Updates (OTA) or zip upload.
All code changes are in git — build locally, create zip, deploy.

---

## 5. Post-deploy checks

- [ ] Admin → Settings → Dispatch — confirm page loads, toggle a feature on/off
- [ ] /book/taxi — confirm Mapbox map loads, geolocation prompt appears
- [ ] Type a destination in taxi search — confirm suggestions appear
- [ ] Complete taxi confirm flow — confirm booking appears in admin panel
- [ ] Admin → Settings — confirm horizontal tab navigation works

---

# Changelog / Release Notes

## v1.5.0 — released

### New features

**Availability & Blockout Date Management**
- Admins can now block date ranges per vehicle or fleet-wide from Admin → Blockouts
- Fleet-wide blockouts prevent all vehicles from being booked during the period
- Per-vehicle blockouts also manageable directly on each vehicle's edit page
- Blocked dates appear as grey bars on the admin calendar
- Public booking app and per-vehicle booking pages both respect blockouts
- Blockout reason is internal-only — not visible to customers

**Automated Email Sequences**
- Customers now receive an automatic confirmation email when a booking is submitted (Booking Received)
- Customers + admin notification email receive a confirmation when booking is set to Confirmed
- Daily cron sends 24hr reminders to customer + admin the day before a confirmed booking starts
- Daily cron sends a post-trip follow-up to customer + admin the day after a booking ends
- All sequences are idempotent — duplicate sends are prevented via BookingEmailLog
- All 4 new email templates are editable via Admin → Settings → Email Templates

**Customer Profiles & Booking History**
- New Admin → Customers section lists all customers grouped by email with booking count, total spend, and last booking date
- Per-customer page shows full booking history with booking refs, vehicle, dates, cost, and status
- Admin can add and delete private internal notes per customer (not visible to customers)

**Enquiry Pipeline**
- New Admin → Enquiries section lists all waitlist enquiries with filter tabs: New, Contacted, Converted, Lost
- Each enquiry has status tracking managed from the booking detail page
- Actions: Mark as Contacted, Notify Customer (sends "dates available" email), Convert to Booking, Mark as Lost
- "Convert to Booking" promotes the enquiry to a pending booking seamlessly
- New "Enquiry — Dates Now Available" email template editable via Admin → Settings → Email Templates

**Customer Enhancements**
- Vendor customer bookings now visible in Admin → Customers (already stored in Booking table)
- Archive/hide a customer from the customer list (booking records are preserved)
- Link multiple email addresses to the same customer profile (admin-only — vendors cannot see linked profiles)
- Linked profiles: merged booking counts and history shown on the primary customer's detail page

### Technical
- New DB tables: `VehicleBlockout`, `BookingEmailLog`, `CustomerNote`, `CustomerArchive`, `CustomerAlias`
- New Booking column: `enquiry_status` (VARCHAR 20, default 'new')
- New env var: `CRON_SECRET`
- New cron endpoint: `POST /api/cron/email-sequences` (Bearer token auth)

---

## v1.6.0 — released

### New features

**Service Feature Toggles (Dispatch Settings)**
- New Admin → Settings → Dispatch page for enabling/disabling per-service features
- Toggleable features: Trip ratings, rating comments, trip sharing, live tracking — per service type (taxi, rideshare, self-drive, chauffeured)
- Changes take effect immediately, cached 60s for public API

**Trip Ratings**
- Customers can rate their trip after completion (1–5 stars) — if enabled in Dispatch settings
- Optional comment field (also toggleable)
- Ratings stored in `TripRating` table, one per booking

**Multi-service Booking App**
- /book redesigned with a service picker (Taxi, Rideshare, Self-Drive, Chauffeured)
- Vehicle hire flow moved to /book/hire — old /book/[slug] URLs auto-redirect
- Taxi flow: 5-screen flow (home → destination → confirm → ride → complete) with MVP placeholder UI

### Technical
- New DB tables: `ServiceFeature` (10 seed rows), `TripRating`
- New public endpoint: `GET /api/service-features?service_type=taxi` (cached 60s)
- New admin endpoints: `GET/PATCH /api/admin/service-features`
- New public endpoint: `POST /api/booking/[id]/rating`
- New client hook: `useServiceFeatures(serviceType)` in lib/hooks

---

## v1.7.0 — released

### New features

**Functional Taxi Flow**
- /book/taxi now uses a real Mapbox GL map with live geolocation
- Desktop: split layout (map left, controls right) — no phone frame
- Live address search via Mapbox Geocoding API (debounced, AU-only)
- Route calculation via Mapbox Directions API — real distance, ETA, fare
- Fare formula: max($8.00, $3.50 + distance_km × $2.20)
- Confirm screen creates a real Booking record in the database
- Ride screen shows countdown ETA with progress bar
- Complete screen loads real trip data from DB; submits rating to TripRating table

**Admin Settings Navigation**
- Settings tabs replaced sidebar nav with horizontal tab strip for better mobile usability

### Technical
- New packages: `react-map-gl`, `mapbox-gl`, `@types/mapbox-gl`
- New env var: `NEXT_PUBLIC_MAPBOX_TOKEN` (public Mapbox access token)
- New endpoint: `POST /api/booking/taxi` (public, creates Booking with service_type='taxi')
- New components: `TaxiMap`, `useMapboxSearch`, `useRoute` hooks
- `book/layout.tsx` simplified — phone frame removed
