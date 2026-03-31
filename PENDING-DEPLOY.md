# Pending Production Deployment

This file tracks everything that must be done on the production server before the next release.
Update it as features are built. Clear it after each successful production deployment.

---

## Current pending version: v1.8.1

### Deploy checklist
- [ ] Upload and extract release zip
- [ ] Run NPM Install in cPanel Node.js app
- [ ] Restart app
- [ ] No DB migrations required
- [ ] No new env vars required

### Post-deploy verification
- [ ] Vendor login → nav bar loads immediately (no refresh needed)
- [ ] Vendor dashboard shows compact stat bar (3 chips) + full bookings list below
- [ ] /vendor/bookings redirects to /vendor
- [ ] "Bookings" no longer appears in vendor nav — only Dashboard, Vehicles, Calendar, Clients, Support
- [ ] "+ Bookings" button in header opens multi-booking flow

---

# Changelog / Release Notes

## v1.8.1

### Fixes
- **Vendor login — nav bar loading**: Added `router.refresh()` before navigation to invalidate Server Component cache, preventing stale nav bar on first login

### UX improvements
- **Vendor dashboard redesign**: Combined dashboard + bookings into a single page
  - Compact stat bar replaces 4-card grid (Bookings This Month, Pending, Active Clients)
  - Full bookings list with status tabs always visible instead of 5-row preview
  - "+ Bookings" button moved to header
- **Vendor nav cleanup**: Removed redundant "Bookings" link (now redirects to dashboard)

---

## v1.8.0(d) — hotfix

### Fixes
- **Taxi booking confirm — map route**: Route line now displays on the confirmation page (was missing `routeGeometry` prop to `<TaxiMap>`)
- **Taxi bookings — admin list**: Now show "Taxi Request" instead of "Unknown Vehicle" and "Taxi" instead of "Chauffeured"
- **Taxi bookings — admin detail**: Heading now shows "Taxi Request" and hire type shows "Taxi"
- **CrazyTel SMS — error visibility**: When SMS API returns an error without a `message` or `error` field, the raw response body is now shown in the test SMS error message, making it easier to diagnose (bad key, unverified number, etc.)

---

## v1.8.0(c) — pending

### Changes
- **Booking app — editable pickup**: `/book/taxi` now shows combined pickup+destination card; pickup is editable with address search and a locate-me button to revert to GPS
- **Booking app — satellite toggle**: Map/Satellite toggle button on all taxi map screens
- **Booking app — confirm flow simplified**: No ETA or route calculation; map shows pins only; submits directly to Booking Received screen
- **Booking app — Booking Received screen**: Clean confirmation with booking ref, route summary, phone callback note, and amber info note
- **API `/api/booking/taxi`**: Removed mandatory `distance_m`/`duration_s`/`fare_cents`; now returns `public_id`

---

## v1.8.0(b) — pending

### Fixes
- **Book Multiple — service type picker**: selecting Taxi/CPV/Vehicle now works correctly (two racing `set()` calls merged into a single `onChange`)
- **Book Multiple — compact table layout**: replaced tall per-booking cards with a dense single-row-per-booking table; horizontally scrollable on small screens

---

## v1.8.0 — pending

### New features

**Vendor — Book Multiple**
- New "Book Multiple" button on Vendor → Bookings alongside the existing "+ New Booking"
- Opens `/vendor/bookings/new/multi` — a fast multi-day booking flow
- Calendar shows existing bookings as amber (pending) / green (confirmed) dot indicators with hover tooltip of booking refs
- Click any day to add a booking row; click the same day again to add a second booking for that day
- Each row is independently configurable: service type, pickup address (required), pickup time (required), passengers (required), destination, return trip toggle + return time, optional client, optional notes
- Red × on each row removes it
- "Create X Bookings" button submits all rows sequentially with live progress indicator
- All trip details stored in `trip_details` JSON column on the Booking record

### Technical
- New component: `src/components/vendor/MultiDayPicker.tsx`
- New page: `src/app/vendor/bookings/new/multi/page.tsx`
- API update: `POST /api/vendor/bookings` now accepts and stores `trip_details`; `contact_name` no longer required (optional for multi-booking flow)

---

## v1.7.2 — pending

### Fixes

**CrazyTel SMS — correct API endpoint**
- Fixed SMS send endpoint: now uses `https://sms.crazytel.net.au/api/v1/sms/send` with `Authorization: Bearer` header and JSON body `{to, from, message}`
- Previous endpoint (`crazytel.io`) was incorrect and returned 401/403

**CrazyTel — account info & DID dropdown**
- CrazyTel tile in Settings → Connections now fetches account info after API key is saved
- Shows masked email (e.g. `j***@example.com`) and account balance as a status card
- From number is now a dropdown populated from numbers/DIDs on the CrazyTel account (falls back to text input if account info unavailable)
- New API endpoint: `GET /api/admin/settings/crazytel/account`

---

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

## v1.7.1 — pending

### New features

**CrazyTel SMS Integration**
- New SMS integration via CrazyTel API (`POST /api/v1/sms/send`)
- API key, from number, and dispatch number configurable in Admin → Settings → Connections
- On taxi booking confirm: SMS sent to customer (confirmation + ETA + ref) and to dispatch number (booking summary)
- SMS not sent if CrazyTel is not configured or disabled — fully non-blocking

**Configurable Notification Templates**
- Admin → Settings → Templates redesigned as a unified list of all 9 notifications (7 email + 2 SMS)
- Each template has an enable/disable toggle (saves immediately) and an Edit button
- Edit opens an inline panel: HTML editor + live preview for email; plain text editor + char/segment counter for SMS
- SMS template variables: `{{contact_name}}`, `{{contact_phone}}`, `{{pickup}}`, `{{destination}}`, `{{eta_mins}}`, `{{booking_ref}}`
- Taxi customer and dispatch SMS messages fully editable and independently toggleable

**Connections Page — App Picker UI**
- Admin → Settings → Connections redesigned as a grid of integration tiles
- Tiles: Microsoft 365, Google Calendar, SMTP, Web Push, CrazyTel SMS — each showing connection status
- Click a tile to expand its configuration panel; click again to collapse
- OAuth callbacks (MS/GC) auto-open the relevant tile

**Booking App Fixes**
- /book splash screen now shows the actual site logo from Admin → Settings → General
- /book/taxi: map starts zoomed out over Kerang/Cohuna/Barham region; centres on user location when geolocation resolves
- /book/taxi: removed hardcoded recent places and Home/Work saved place options
- /book/taxi/confirm: shows nearest taxi base (Cohuna/Kerang/Koondrook) based on Haversine distance; fare estimate removed
- /book/taxi/ride: mock driver details removed; replaced with generic "Your taxi is on the way"
- /book/taxi/complete: fare and mock driver row removed; rating widget shown inline
- Map full-screen height fixed on desktop (`lg:h-screen` + `lg:h-full` on all taxi screens)

### Technical
- New files: `src/lib/sms.ts`, `src/lib/sms-templates.ts`, `src/lib/sms-template-defaults.ts`
- New API: `GET/PATCH/POST /api/admin/settings/crazytel`
- SMS template bodies stored in `Setting` table: `sms_template_taxi_customer`, `sms_template_taxi_dispatch`
- Enable flags stored in `Setting` table: `*_enabled` keys (default enabled if not set)
- No new DB tables or schema changes required

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
