# Pending Production Deployment

This file tracks everything that must be done on the production server before the next release.
Update it as features are built. Clear it after each successful production deployment.

---

## Current pending version: v1.14.0 (unreleased)

### Deploy checklist
- [ ] Upload and extract release zip
- [ ] Run NPM Install in cPanel Node.js app
- [ ] Apply DB migration (see SQL below)
- [ ] Restart app

### Pending SQL

```sql
-- v1.12.0 (apply if not already done)
ALTER TABLE `Booking` ADD COLUMN `ms_event_id` VARCHAR(191) NULL AFTER `google_event_id`;
ALTER TABLE `Booking` DROP COLUMN `google_event_id`;

-- v1.13.0 — Vendor service type toggles
ALTER TABLE `Vendor` ADD COLUMN `taxi_enabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `vehicle_hire_enabled`;
ALTER TABLE `Vendor` ADD COLUMN `vehicle_hire_enabled` TINYINT(1) NOT NULL DEFAULT 1 AFTER `is_active`;
```

### New env vars
None.

### Post-deploy steps
1. Apply all pending SQL above in phpMyAdmin (skip any already applied)
2. In Admin → Settings → Connections, **disconnect and reconnect Microsoft 365** if not already done (required for `Calendars.ReadWrite` scope)
3. In Admin → Settings → General → Site Branding: set a **Vendor Portal Name** to distinguish it from the Admin portal in browser tabs

### Post-deploy verification
- [ ] Admin → Vendor detail page → Username shows Edit button; clicking it allows username change with uniqueness validation
- [ ] Admin → Vendor detail page → Taxi Trips toggle defaults to off; Vehicle Hire defaults to on
- [ ] Vendor portal → Book Multiple → only enabled trip modes show as buttons
- [ ] Bulk booking with conflicting dates → amber conflict prompt appears with "Submit as Waitlist Enquiry" option
- [ ] Submitting conflicts as enquiries → creates enquiry-status bookings, success screen shows enquiry count

---

### Previous v1.9.1 post-deploy verification
- [ ] Log into vendor portal → nav bar appears immediately (no refresh required)
- [ ] Visit Vendor → Bookings → New → Multiple
- [ ] See trip mode toggle: "Taxi Trips" vs "Vehicle Hire"
- [ ] Click "Vehicle Hire" → table shows Start Date, End Date, Vehicle*, Client, Notes columns
- [ ] Click calendar day → adds a vehicle hire row with start_date = end_date = clicked day
- [ ] Edit start_date and end_date → separate date pickers work
- [ ] Click "Taxi Trips" → table switches to original format (Date, Service, Vehicle, Pickup address*, Time*, Pax*, Destination, Return, Client, Notes)
- [ ] Click calendar day → adds a taxi row with date = clicked day
- [ ] Add at least 2 rows in either mode → "Authorised By" field appears below table (required field with validation)
- [ ] Submit without "Authorised By" → error message shows "Authorised By is required"
- [ ] Fill in "Authorised By" → error clears
- [ ] Submit bookings → redirected to bookings list
- [ ] Check admin email → ONE summary email received (not N individual emails) with table of all bookings, "Authorised By" footer

---

# Changelog / Release Notes

## v1.14.0

### New features

**Bug report button**
- New "Report Bug" button in the admin top bar (icon on narrow screens, labelled on wide)
- Opens a modal — enter a title and description; page URL, viewport size, and browser string are captured automatically
- Submits directly to the private GitHub repo as an issue with labels `bug` and `admin-portal-report`
- Labels are created automatically on first use if they don't exist
- Success screen shows the issue number and a direct link to GitHub

**Admin profile page**
- `/admin/profile` now loads correctly (was previously a 404)
- Accessible via the user dropdown → Profile Settings
- Shows username and role; master admin sees a note that their password is in env vars
- Additional admin users can change their password via the form

### Bug fixes

**Customers — total spend showing 10× too high**
- `SUM(total_cost)` from mysql2 returns a string; adding `+ 0` (from the alias fallback) caused JS string concatenation rather than numeric addition — e.g. `"15000" + 0 = "150000"` — then dividing by 100 gave 10× the correct value
- Fixed by wrapping in `Number()` before addition

### Technical
- `src/app/admin/customers/page.tsx` — `Number(c.total_spend)` and `Number(aliasCustomer.total_spend)`
- `src/app/admin/profile/page.tsx` + `AdminProfileForm.tsx` — new server/client profile page
- `src/app/api/admin/profile/route.ts` + `password/route.ts` — profile GET + password POST
- `src/app/api/admin/bug-report/route.ts` — GitHub Issues API integration
- `src/app/admin/BugReportModal.tsx` — modal UI
- `src/app/admin/AdminTopBar.tsx` — bug report button wired in

---

## v1.13.0

### New features

**Vendor username editing**
- Admins can now change a vendor's username directly from the vendor detail page
- Click Edit next to the username field, enter the new username, then Confirm
- Uniqueness is validated server-side — duplicate usernames are rejected with a clear error

**Per-vendor service type toggles**
- Each vendor now has independent on/off toggles for Taxi Trips and Vehicle Hire
- Taxi Trips defaults to off; Vehicle Hire defaults to on
- Vendor portal → Book Multiple respects these toggles — disabled modes are hidden from the trip type selector

**Bulk booking conflict → waitlist enquiry prompt**
- When bulk bookings fail because a vehicle is already booked, a single amber prompt now appears offering to submit all conflicting bookings as waitlist enquiries
- Previously the user saw individual error messages with no follow-up action
- Submitting as enquiries uses the same `is_enquiry = 1` flag; these are handled as standard waitlist bookings
- Partial batches (some succeeded, some conflicted) are handled gracefully — confirmed bookings are recorded, conflict prompt appears for the rest

### Technical
- `src/app/api/admin/vendors/[id]/route.ts` — PATCH now handles `username` (uniqueness check), `taxi_enabled`, `vehicle_hire_enabled`
- `src/app/api/vendor/settings/route.ts` — new endpoint returning `taxi_enabled`/`vehicle_hire_enabled` for the logged-in vendor
- `src/app/vendor/bookings/new/multi/page.tsx` — refactored submit into `buildBookingPayloads`, `handleSubmit`, `submitConflictsAsEnquiries`; conflict prompt UI added
- New DB columns: `Vendor.taxi_enabled` (TINYINT DEFAULT 0), `Vendor.vehicle_hire_enabled` (TINYINT DEFAULT 1)

---

## v1.12.0

### New features

**Email templates — separate admin/customer versions**
- `booking_confirmed`, `reminder_24hr`, and `followup` templates now have separate Admin and Customer variants editable in Settings → Templates
- Each uses a different `BookingEmailLog` key so they are tracked independently
- Both default to the same content — edit the Admin version to send internal-style notifications

**Batch booking summary — editable template + vendor receives copy**
- Batch booking summary email is now editable in Settings → Templates as "Batch Booking Summary (Admin + Vendor)"
- Supports: `{{vendor_name}}`, `{{booking_count}}`, `{{booking_count_plural}}`, `{{trip_mode}}`, `{{bookings_table}}`, `{{authorised_by}}`, `{{site_name}}`
- Vendor's contact email now receives a copy alongside the admin notification email

**Email template editor — full-width split layout**
- Editor and live preview now fill the screen side-by-side (50/50) on wide screens; stacked on mobile
- Other settings pages retain the 640px constrained width

**Vendor bookings → automatically confirmed**
- Vendor-created bookings (single and bulk) are now inserted as `confirmed` instead of `pending`
- Booking confirmed email is sent instead of "new booking received" for single bookings

**Double booking prevention**
- Vendor single and bulk booking routes now check for overlapping confirmed/pending bookings on the same vehicle before inserting
- Returns `409 Conflict` with message "Vehicle is already booked for those dates" if a conflict is found

### Technical
- `email-template-defaults.ts` — added `booking_confirmed_admin`, `reminder_24hr_admin`, `followup_admin`, `bulk_booking_summary` entries
- `email-sequences.ts` — `sendBookingConfirmed`, `sendDue24hrReminders`, `sendFollowups` now send separate templates per recipient type
- `email.ts` — `sendBulkVendorBookingSummary` now accepts `vendorEmail?`, uses DB template, sends to both recipients
- `src/app/admin/settings/layout.tsx` — max-width removed from layout; moved to individual forms

---

## v1.11.0

### New features

**Admin Quick Add — Vendor assignment**
- Vendor dropdown added to the Quick Add Booking form (below Dates)
- Selecting a vendor pre-fills the contact email and phone from the vendor's account details
- Booking is tagged to the vendor's account and appears in their portal

**Vendor portal name — separate from admin portal**
- Admin → Settings → General now has a dedicated "Vendor Portal Name" field
- Allows different names to show in the header of the admin vs vendor portals (useful when both are open in tabs)
- Falls back to Admin Portal Name if blank, preserving existing behaviour

### Bug fixes

**Vendor portal — `contact_email cannot be null` on booking creation**
- When a vendor created a booking without linking a client, `contact_email` was inserted as `null`, causing a DB constraint error
- Fixed: both the single (`POST /api/vendor/bookings`) and bulk (`POST /api/vendor/bookings/bulk`) routes now fetch the vendor's own `contact_email` and `contact_phone` as a final fallback

**Vendor portal — Client column removed from Vehicle Hire bulk form**
- Vehicle Hire rows in the multi-booking table previously showed a Client dropdown that had no effect (contact details were not sourced from client for hire bookings)
- Removed from Vehicle Hire table header and row; client dropdown remains in Taxi Trips rows as before

### Technical
- `src/lib/site.ts` — new `getVendorPortalName()` exported function; reads `vendor_name` setting, falls back to `admin_name`
- `src/app/vendor/layout.tsx` — uses `getVendorPortalName()` instead of `getAdminName()`
- `src/app/admin/settings/GeneralForm.tsx` / `page.tsx` — `vendor_name` key added to settings query and save

---

## v1.10.0

### New features

**Microsoft 365 Calendar Sync**
- Bookings now sync automatically to the connected Outlook calendar when created, updated, or deleted
- Events are colour-coded by status: Yellow = Pending, Green = Confirmed, Red = Cancelled, Blue = Completed, Purple = Enquiry
- Create and update use MS Graph API (`POST /me/events`, `PATCH /me/events/{id}`)
- 404 recovery: if an event was deleted from Outlook, a new one is created automatically on next sync
- Requires reconnecting MS 365 in Admin → Settings → Connections to grant the new `Calendars.ReadWrite` scope

**Google Calendar removed**
- Google Calendar integration has been removed; Microsoft 365 is the sole calendar integration
- `gc-auth`, `gc-callback`, `gc-disconnect` API routes removed
- Google Calendar tile removed from Settings → Connections

**Remember Me — 30-day persistent login**
- All three portals (Admin, Vendor, Driver) now show a "Remember me for 30 days" checkbox on the login page
- When checked, the session cookie `max-age` is set to 30 days instead of the default 8 hours
- JWT expiry is extended to match the cookie lifetime

**Date format standardisation (en-AU)**
- All dates across admin and driver portals now display in Australian format (e.g. "9 Apr 2026")
- Fixed 5 pages that were missing the `'en-AU'` locale on `toLocaleDateString` / `toLocaleString`
- Fixed 3 list views that were showing raw `YYYY-MM-DD` database strings instead of formatted dates

### Bug fixes

**Vendor portal — bookings showing from other vendors**
- Dashboard and booking list were including bookings from all vendors due to an overly broad SQL filter
- Fixed: query now strictly filters by `vendor_id = ?`

**Vendor portal — View button returning 404**
- Was a downstream effect of the above — foreign bookings failing the detail page auth check
- Resolved by the vendor isolation fix above

**Vendor portal — multi-booking form not saving**
- Bookings were being created in the DB but the success redirect hit a redirect stub, giving zero feedback
- Fixed: replaced redirect with an in-page success screen showing created count and any errors

**CrazyTel dispatch number not persisting**
- SQL `IN` clause had 6 placeholders for 7 values — `crazytel_dispatch_number` was silently dropped from the query
- Fixed: corrected to 7 placeholders

### Technical

- `src/lib/calendar.ts` — rewritten to MS Graph only; `syncBookingToCalendar` and `deleteCalendarEvent` updated
- MS OAuth scope updated: `Calendars.ReadWrite offline_access` added to both auth and callback routes
- `Booking.ms_event_id` column added to schema
- `Booking.google_event_id` column removed from schema

---

## v1.9.2

### New features
- **PWA / installable booking app**: Customers can now add `/book` to their home screen on iOS and Android — opens in standalone mode (no browser chrome) like a native app
- **Dynamic app icon**: Icon is generated server-side from the configured PWA icon, falling back to site logo, then first letter of site name — fully white-label
- **App Icon upload**: New field in Admin → Settings → General to upload a dedicated app icon (PNG/JPG/WebP, 512×512 recommended)
- **Web app manifest** auto-injected into all pages (`display: standalone`, `scope: /book`, `start_url: /book`)
- **iOS standalone support**: `apple-mobile-web-app-capable` meta added to root layout
- **Fix**: Title template in `/book` layout was hardcoded to `CKB` — now uses dynamic site name

---

## v1.9.1

### Bug fixes

**Vehicle Hire bulk submission not saving bookings**
- Bulk API was returning HTTP 207 (Multi-Status) when bookings failed, which the client treated as success (`res.ok === true` for 2xx), silently swallowing errors and redirecting with 0 created
- Fix: return 400 when all bookings fail; client now checks `d.errors` and shows messages instead of blindly redirecting

**CrazyTel dispatch number not saving**
- "Done" button on dispatch number (and from number) edit only toggled edit state, never triggered `handleSave()`
- Fix: "Done" replaced with "Save" (triggers save) + "Cancel" (reverts to original value)

### UX improvements

**Vehicle Hire — "Same vehicle for all" mode**
- New toggle next to Vehicle Hire button: "Same for all" vs "Choose per row"
- "Same for all": single vehicle dropdown above the table; vehicle column removed from rows
- "Choose per row": vehicle dropdown appears per row (original behavior)

**Trip mode buttons redesigned**
- Taxi Trips / Vehicle Hire buttons now larger (15px font, padded, border-2) and positioned above calendar for prominence

**Authorised By + Submit consolidated**
- "Authorised By" field and submit button now grouped in a card below the booking table for clear visual flow

---

## v1.9.0

### New features

**Vendor Portal — Trip Type Picker & Vehicle Hire Mode**
- Multi-booking form now has trip mode toggle: Taxi Trips vs Vehicle Hire
- **Vehicle Hire mode**: simplified form collecting only vehicle, start/end dates, optional client, notes
- **Taxi mode**: existing flow (pickup address, time, passengers, destination, return trip)
- Both modes use the shared calendar to select booking dates
- Switching modes resets all entered rows (safety against mixing trip types)

**Vendor Portal — Booking Audit Trail**
- New "Authorised By" field (required) on multi-booking form
- Captures the name of the person authorising the bookings
- Stored in each booking's `trip_details` JSON for audit purposes
- Validation prevents submission if field is empty

**Vendor Portal — Bulk Booking Email**
- Multi-booking submissions now send a single consolidated summary email instead of N individual emails
- Summary email includes:
  - Booking count and trip type
  - Table of all bookings (Ref, Vehicle/Service, Start Date, End Date, Days)
  - "Authorised By" footer with the authoriser's name
- New `POST /api/vendor/bookings/bulk` endpoint handles batch creation + single summary email

### Bug fixes

**Vendor Portal — Nav Bar on Login**
- Fixed nav bar not appearing until manual refresh after login
- Root cause: `router.refresh()` was called before `router.push()`, causing the Next.js router cache to be invalidated after navigation completed
- Solution: replaced sequential refresh+push with hard `window.location.href` redirect, guaranteeing full page load with fresh cookie

---

## v1.8.2

## v1.8.2

### Security fixes
- **Booking confirmation URL privacy**: Customer details (name, email, phone) no longer passed in URL query params; confirmation page now fetches booking from database using only booking ID
- **Phone number sanitization**: SMS now strips spaces from phone numbers before sending (fixes delivery for numbers entered as `0408 597 621`)

### UX improvements  
- **CrazyTel settings masking**: API keys display as masked (••••••••) with "Edit" button; phone numbers show actual value with "Edit" button when saved
- **Settings edit pattern**: Clear separation between view mode (masked/protected) and edit mode (input fields)
- **Better for white-label**: Non-technical users can see what's configured without risk of accidental changes

---

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
