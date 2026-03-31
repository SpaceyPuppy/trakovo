# Trakovo — TODO / Roadmap

Items are grouped by priority. Top of each group = highest priority.

---

## Immediate / launch blockers

- [ ] Refine the address lookup. Show one line which has the landmark, POI name, or street address (such as "16 King Edward St, Cohuna" rather than the current two line display of "King Edward Street" in bold and underneath "16 King Edward Street, Cohuna, VIC, 3568"). I also cannot search for landmark names or points of interest such as "IGA Cohuna" or "Ritchies IGA" which is in Cohuna, VIC. This is an issue as people will search for landmarks by name in the towns.

- [ ] Text messages need to be fixed.
  Customer SMS: "Booking received. We'll call to confirm. Pickup: <pickup address>, heading to: <landmark name, dest. street address, town (doesn't need postcode, state, etc)>. -CKB.

  Dispatch SMS: "Taxi Rqst: <Name> (<Number>), from: <pickup st address> to: <landmark/POI, full street address>. [note: this should be clickable for a map.]"

- [ ] If a customer enters their mobile as "0408 597 621" they do not receive the customer SMS. 0408597621 works however. Numbers will have to be sanitised and formatted for the API call and passed through without spaces.

---

## High priority (build soon after launch)

- [ ] Review the booking app routing
---

## Medium priority

- [ ] **PDF invoice / quote generation**
  Generate a downloadable PDF per booking — invoice or quote format.
  Uses fillable `{{tag}}` fields consistent with the existing email template system.
  Editable template (header, footer, payment terms, logo).
  Admin can download from booking detail page; optionally email to customer.
  Consider: `@react-pdf/renderer` or `pdfkit` (pure JS, no binary deps — important for cPanel).

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
