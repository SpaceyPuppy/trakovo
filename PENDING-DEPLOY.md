# Pending Production Deployment

This file tracks everything that must be done on the production server before the next release.
Update it as features are built. Clear it after each successful production deployment.

---

## Current pending version: v1.7.0

---

## 1. Database — run via phpMyAdmin

```sql
-- Feature: Availability & blockout date management
CREATE TABLE IF NOT EXISTS `VehicleBlockout` (
  `id` VARCHAR(191) NOT NULL,
  `vehicle_id` VARCHAR(191) NULL,
  `start_date` VARCHAR(10) NOT NULL,
  `end_date` VARCHAR(10) NOT NULL,
  `reason` VARCHAR(191) NOT NULL DEFAULT '',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `VehicleBlockout_vehicle_idx` (`vehicle_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Feature: Automated email sequences
CREATE TABLE IF NOT EXISTS `BookingEmailLog` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `booking_id` VARCHAR(191) NOT NULL,
  `template_key` VARCHAR(191) NOT NULL,
  `sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX `BookingEmailLog_unique` (`booking_id`, `template_key`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Feature: Enquiry pipeline — enquiry_status column
ALTER TABLE `Booking`
  ADD COLUMN IF NOT EXISTS `enquiry_status` VARCHAR(20) NULL DEFAULT 'new' AFTER `is_enquiry`;

-- Feature: Vehicle visibility controls + licence category (v1.5.x)
ALTER TABLE `Vehicle`
  ADD COLUMN IF NOT EXISTS `public_bookings_enabled` TINYINT(1) NOT NULL DEFAULT 1 AFTER `is_available`,
  ADD COLUMN IF NOT EXISTS `vendor_bookings_enabled` TINYINT(1) NOT NULL DEFAULT 1 AFTER `public_bookings_enabled`,
  ADD COLUMN IF NOT EXISTS `licence_category` VARCHAR(10) NOT NULL DEFAULT '' AFTER `fuel`;

-- Feature: Customer profiles & internal notes
CREATE TABLE IF NOT EXISTS `CustomerNote` (
  `id` VARCHAR(191) NOT NULL,
  `contact_email` VARCHAR(191) NOT NULL,
  `text` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `CustomerNote_email_idx` (`contact_email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Feature: Customer profile linking and archiving
CREATE TABLE IF NOT EXISTS `CustomerArchive` (
  `email` VARCHAR(191) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `CustomerAlias` (
  `id` VARCHAR(191) NOT NULL,
  `primary_email` VARCHAR(191) NOT NULL,
  `alias_email` VARCHAR(191) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `CustomerAlias_alias_email_unique` (`alias_email`),
  INDEX `CustomerAlias_primary_email_idx` (`primary_email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Previously noted — apply if not already done
CREATE TABLE IF NOT EXISTS `AdminUser` (
  `id` VARCHAR(191) NOT NULL,
  `username` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(191) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX `AdminUser_username_key` (`username`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Driver` (
  `id` VARCHAR(191) NOT NULL,
  `public_id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `username` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL DEFAULT '',
  `phone` VARCHAR(191) NOT NULL DEFAULT '',
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `Driver_public_id_key` (`public_id`),
  UNIQUE INDEX `Driver_username_key` (`username`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `DriverMessage` (
  `id` VARCHAR(191) NOT NULL,
  `driver_id` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `direction` VARCHAR(20) NOT NULL DEFAULT 'admin_to_driver',
  `status` VARCHAR(20) NOT NULL DEFAULT 'open',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `DriverMessage_driver_idx` (`driver_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Booking`
  ADD COLUMN IF NOT EXISTS `driver_id` VARCHAR(191) NULL AFTER `vendor_client_id`;

-- Feature: CorporateEnquiry (v1.5.7)
CREATE TABLE IF NOT EXISTS `CorporateEnquiry` (
  `id` VARCHAR(191) NOT NULL,
  `public_id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(50) NULL,
  `organisation` VARCHAR(191) NULL,
  `event_type` VARCHAR(100) NULL,
  `guests` VARCHAR(50) NULL,
  `message` TEXT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'new',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `CorporateEnquiry_public_id_unique` (`public_id`),
  INDEX `CorporateEnquiry_status_idx` (`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Feature: Service feature toggles (dispatch settings) + trip ratings (v1.6.0)
CREATE TABLE IF NOT EXISTS `ServiceFeature` (
  `id`           VARCHAR(36) NOT NULL,
  `service_type` VARCHAR(32) NOT NULL,
  `feature_key`  VARCHAR(64) NOT NULL,
  `is_enabled`   TINYINT(1) NOT NULL DEFAULT 0,
  `config`       JSON DEFAULT NULL,
  `updated_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_service_feature` (`service_type`, `feature_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed all features as OFF by default
INSERT IGNORE INTO `ServiceFeature` (`id`, `service_type`, `feature_key`, `is_enabled`, `config`) VALUES
(UUID(), 'taxi',        'rating',         0, '{"max_stars":5,"mandatory":false}'),
(UUID(), 'taxi',        'rating_comment', 0, '{"max_length":500}'),
(UUID(), 'taxi',        'share_trip',     0, NULL),
(UUID(), 'taxi',        'live_tracking',  0, NULL),
(UUID(), 'rideshare',   'rating',         0, '{"max_stars":5,"mandatory":true}'),
(UUID(), 'rideshare',   'rating_comment', 0, '{"max_length":500}'),
(UUID(), 'rideshare',   'share_trip',     0, NULL),
(UUID(), 'rideshare',   'live_tracking',  0, NULL),
(UUID(), 'self_drive',  'rating',         0, '{"max_stars":5,"mandatory":false}'),
(UUID(), 'chauffeured', 'rating',         0, '{"max_stars":5,"mandatory":false}');

CREATE TABLE IF NOT EXISTS `TripRating` (
  `id`         VARCHAR(36) NOT NULL,
  `booking_id` VARCHAR(191) NOT NULL,
  `stars`      TINYINT NOT NULL,
  `comment`    TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `TripRating_booking_unique` (`booking_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

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

- [ ] Admin → Blockouts — confirm page loads, can add fleet-wide and per-vehicle blockouts
- [ ] Admin → Vehicles → edit a vehicle — confirm Blocked Dates section appears at bottom
- [ ] Admin → Calendar — confirm blockouts appear as grey bars
- [ ] Public booking app — select dates overlapping a blockout — confirm vehicle is hidden/blocked
- [ ] Submit a test booking — confirm customer receives booking received email
- [ ] Set booking to confirmed — confirm customer + admin receive confirmed email
- [ ] Admin → Settings → Email Templates — confirm 4 new templates appear (Booking Received, Booking Confirmed, 24hr Reminder, Post-trip Follow-up)
- [ ] Trigger cron endpoint manually: `curl -X POST https://yourdomain.com/api/cron/email-sequences -H "Authorization: Bearer YOUR_CRON_SECRET"` — confirm JSON response
- [ ] Admin → Customers — confirm customer list loads, click a customer, confirm booking history and notes section appear
- [ ] Add and delete a customer note — confirm persists correctly
- [ ] Archive a customer, confirm they disappear from the list; unarchive and confirm they reappear
- [ ] Link two email aliases on a customer profile — confirm merged booking counts in the list
- [ ] Admin → Enquiries — confirm list loads with filter tabs
- [ ] On a booking with is_enquiry = 1 — confirm Enquiry Manager panel appears with status buttons
- [ ] Test "Mark Contacted", "Mark Lost", and "Convert to Booking" actions
- [ ] Test "Notify Customer" button — confirm email is sent

---

---

# Changelog / Release Notes

## v1.5.0 — (unreleased)

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
- Availability check (`/api/vehicles/available`) now excludes blockout date ranges
- `getAvailability()` in lib/api.ts now includes blockouts for per-vehicle booking calendar

---

## v1.6.0 — (unreleased)

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

## v1.7.0 — (unreleased)

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
