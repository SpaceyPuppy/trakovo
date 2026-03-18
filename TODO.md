# Trakovo — TODO / Roadmap

Items are grouped by priority. Top of each group = highest priority.

---

## Immediate / launch blockers

- [x] **Availability & blackout date management**
  Admins can block date ranges per vehicle (maintenance, private events, public holidays).
  Currently no way to prevent bookings outside of having a confirmed booking — overbooking risk.
  Needs: admin UI to add/remove blocked ranges per vehicle, block ranges factored into the public
  availability check (`/api/vehicles/available`), calendar view should display blocked dates.

---

## High priority (build soon after launch)

- [x] **Automated email sequences**
  Trigger-based emails sent automatically without admin action:
  - Booking received (immediate, to customer)
  - Booking confirmed (on status change, to customer)
  - Reminder 48 hrs before start date (to customer + assigned driver)
  - Day-of pickup instructions (morning of start date, to customer)
  - Post-trip follow-up / thank you (day after end date, to customer)
  Uses the existing email template system. Needs a scheduled job or cron-style trigger
  (consider a lightweight cron endpoint called by cPanel's cron scheduler).

- [x] **Enquiry pipeline / follow-up workflow**
  Dedicated Admin → Enquiries view with filter tabs (New, Contacted, Converted, Lost).
  Status tracking per enquiry, "Convert to Booking" action, "Notify Customer" sends availability email.
  Managed via EnquiryManager panel on the booking detail page.

- [x] **Customer profile & booking history**
  Group bookings by contact email to build a customer record.
  Customer list in admin (Admin → Customers), per-customer view showing all bookings, total spend,
  first/last booking date. Internal admin notes per customer (CustomerNote table).
  Admin-facing only — no customer login required.

---

## Medium priority

- [ ] **PDF invoice / quote generation**
  Generate a downloadable PDF per booking — invoice or quote format.
  Uses fillable `{{tag}}` fields consistent with the existing email template system.
  Editable template (header, footer, payment terms, logo).
  Admin can download from booking detail page; optionally email to customer.
  Consider: `@react-pdf/renderer` or `pdfkit` (pure JS, no binary deps — important for cPanel).

- [ ] **SMS notifications via CrazyTel API**
  CrazyTel (Australian VOIP) provides a documented REST API for outbound SMS.
  Triggers: booking confirmed, 24-hr reminder, driver assigned, day-of pickup.
  Needs: CrazyTel API key in settings/env, opt-in flag per booking (or default on),
  SMS templates editable in admin settings (similar to email templates).
  Admin setting to enable/disable SMS globally.

---

## Lower priority (plan now, build later)

- [ ] **Vehicle maintenance tracking**
  Per-vehicle maintenance log: service records, WOF/rego due dates, odometer, repair invoices.
  File attachments (invoices, compliance docs) stored in UPLOAD_DIR.
  Admin dashboard flag when a vehicle has overdue or upcoming service.
  Vehicle automatically flagged as unavailable when booked in for service (links to blackout dates).
  Purpose: compliance record-keeping and fleet health visibility.

- [ ] **Electronic document signing**
  Allow customers to sign documents (hire agreements, special conditions) electronically.
  Options: in-house signature canvas (draw/type signature, captured as image + audit timestamp),
  or third-party integration (DocuSign, HelloSign/Dropbox Sign — check free tier limits).
  In-house preferred for cost control. Signed document stored as PDF in UPLOAD_DIR per booking.
  Note: hire agreement acceptance is already recorded (checkbox + timestamp) — this is an
  enhancement for documents that require a formal signature image on a final PDF.

---

## Previously noted / other

- [ ] "Contact Us / POA" vehicle option — premium vehicles that can't be booked online, show a contact CTA instead of booking form
- [ ] Contact Us page (`/contact`) — general public enquiry form
- [ ] About page (`/about`)
- [ ] Homepage placeholder text — update or make editable via admin settings
- [ ] Admin password reset via email auth (prevent unauthorised reset of master account password)

---

## Schema work required before deploying to a fresh server

The following are used in code but missing from `prisma/init.sql` — must be applied manually via phpMyAdmin:
- `AdminUser` table
- `Driver` table
- `DriverMessage` table
- `Booking.driver_id` column
(See CLAUDE.md for the exact SQL.)
