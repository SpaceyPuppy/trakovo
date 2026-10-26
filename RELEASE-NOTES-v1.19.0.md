# Trakovo v1.19.0 — Special Occasions and security update

**Full-package cPanel installation required. Do not use the Admin OTA upload form
for this release.** The security changes replace Next.js, React and runtime dependencies;
the server must use patched Node.js 24.22.1+ (24.x) and the new package-lock.json.
Follow PENDING-DEPLOY.md before replacing the running application.

## Website and vehicle controls

- New Special Occasions page for weddings, debutante balls, school formals, graduations,
  celebrations and corporate functions, with classic/luxury vehicle enquiries.
- Desktop dropdown and mobile navigation: Special Occasions, Corporate Events, Services,
  Our Fleet, Contact and View Fleet. Corporate Events opens Professional Services.
- Admin vehicle switches for Feature on homepage and Show on Special Occasions.
  Both are opt-in: after installation select appropriate active, public vehicles.
  Homepage shows up to three selected vehicles, newest first. Inactive or hidden
  vehicles are excluded automatically, including from direct public detail links.
- Event form saves into Admin → Enquiries → Contact Enquiries and notifies the configured
  admin email. Event date, locations, passenger numbers and vehicle preference are retained.
  The enquiry page works before vehicles have been selected.

## Security and platform

- Remove tracked private environment files while retaining local copies. Historical
  credentials remain in public Git history: review and rotate any matching live values
  before deployment. Production portal signing rejects missing/development secrets.
- Upgrade to Next.js 16.4.3, React 19.3.1 and sharp 0.35.5; update affected runtime and
  transitive dependencies. Migrate existing request parameters and cookie APIs as required
  by Next.js 16, preserving portal authentication.
- Restrict Next's remote image proxy. Harden enquiry validation, request sizes and email
  HTML escaping. Update the ZIP extraction library and validate OTA archive entries,
  expanded sizes, symlinks and full-install manifests before extraction.
- Host actions for PHP CVE-2026-109618 / 109619, emerging CVE-2026-115560, and Node.js
  CVE-2026-111497 and related fixes are in SECURITY-REVIEW-2026-10-26.md.
  Publishing/installing Trakovo does not patch PHP, cPanel or CloudLinux.

## Database and installation

- Apply the two Vehicle showcase columns from
  database/migrations/0002-v1.19.0-vehicle-showcases.sql after the documented preflight.
- Carry forward Booking.licence_verification_deferred from v1.17 only if absent.
- No new environment variables or cron jobs. Keep the existing database, uploads and
  private environment configuration. Never import the fresh schema over production.
- Back up the matching old application, package manifests and dependencies. Rolling back
  only .next is insufficient after a dependency upgrade. Leave additive SQL in place.

See PENDING-DEPLOY.md for the complete installation and post-deployment checklist.
