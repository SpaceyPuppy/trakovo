# Pending Production Deployment

## Last confirmed production version: v1.15.3 (owner confirmed 12 October 2026)

This is a historical confirmation, not a live check on 26 October. Verify the installed
version before starting. The owner manages this cPanel installation; release publication
does not install it or confirm host patching. The VPS migration has not occurred.

## Current pending version: v1.19.0

## v1.19.0 — (unreleased)

Combined Special Occasions, vehicle showcase and security release.
**Install the full `trakovo-v1.19.0.zip` through cPanel File Manager. Do not upload it
to Admin → Settings → Updates. There is no OTA bundle for this release.**

The framework changes from Next.js 14 / React 18 to Next.js 16.4.3 / React 19.3.1.
Replacing only .next would leave incompatible and vulnerable server dependencies.
This release requires a short maintenance window with a matching build, configuration,
package-lock.json, installed dependencies and patched Node.js runtime.

### 1. Host preparation — provider/owner

- [ ] Ask the provider to complete and evidence the actions in
      [SECURITY-REVIEW-2026-10-26.md](SECURITY-REVIEW-2026-10-26.md): PHP CVE-2026-109618
      / 109619 across cPanel internal PHP and all installed PHP variants, the
      CVE-2026-115560 precaution, current CloudLinux/cPanel security updates and restarts.
- [ ] Confirm cPanel offers **Node.js 24.22.1 or a later patched 24.x** for this specific
      Passenger application. An older unpatched Node 24 build is insufficient.
      If unavailable, stop and have the provider supply it before installation.
- [ ] Record existing app root, startup file (`app.js`), Node selection and environment
      configuration. Retain all existing secrets and `UPLOAD_DIR`; no new env vars or
      cron jobs are required. Do not publish secrets in a support ticket.
- [ ] Confirm the existing ADMIN_JWT_SECRET, VENDOR_JWT_SECRET and DRIVER_JWT_SECRET
      are distinct, strong private values, and COOKIE_SECURE is true for production HTTPS.
      Do not use the development fallback secret values. Preserve valid existing values
      to avoid unnecessary session invalidation.
- [ ] Back up the database, external uploads, current complete application (including
      hidden .next), package.json, package-lock.json, configuration and the matching
      dependency environment. Confirm the backup can be restored. Keep it outside the
      directory being replaced. Record the old runtime/dependency configuration.

PHP/cPanel remediation can be performed independently now. A Trakovo ZIP does not patch
those components. Production security status stays unverified until the provider confirms.

### 2. Database preflight — before installing the build

Select the existing production database in phpMyAdmin and run:

```sql
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'Vehicle'
        AND COLUMN_NAME IN ('feature_on_homepage', 'show_on_special_occasions'))
       OR (TABLE_NAME = 'Booking' AND COLUMN_NAME = 'licence_verification_deferred'));

SHOW TABLES LIKE 'ContactEnquiry';
```

ContactEnquiry must already exist for the contact/event inbox. If missing, stop and
check the actual database version/schema rather than importing a fresh database.

Apply **only absent columns**, once:

```sql
-- v1.17 carry-forward: only if the Booking column is absent.
ALTER TABLE `Booking`
  ADD COLUMN `licence_verification_deferred` BOOLEAN NOT NULL DEFAULT false
  AFTER `driver_licence_expiry`;

-- v1.19: run each statement only if that Vehicle column is absent.
ALTER TABLE `Vehicle`
  ADD COLUMN `feature_on_homepage` BOOLEAN NOT NULL DEFAULT false
  AFTER `vendor_bookings_enabled`;

ALTER TABLE `Vehicle`
  ADD COLUMN `show_on_special_occasions` BOOLEAN NOT NULL DEFAULT false
  AFTER `feature_on_homepage`;
```

When both new Vehicle columns are absent, the equivalent combined ALTER is supplied
in `database/migrations/0002-v1.19.0-vehicle-showcases.sql`. Choose either that migration
or the individual statements above, not both. Repeat the preflight: expect three
non-nullable boolean/TINYINT(1) columns with default 0. If an existing definition
differs, stop and inspect it. Do not rerun successful ALTERs or historical migrations.
**Never import `prisma/init.sql` over the existing production database.**

### 3. Install the full package — cPanel

1. Download `trakovo-v1.19.0.zip` from the reviewed GitHub release and verify its checksum
   against the published release asset digest. Upload it through cPanel File Manager.
2. Schedule the maintenance window and **stop the Node.js application** in cPanel
   (or have the provider stop Passenger). A stopped app cannot serve its own maintenance
   page; use a provider-level holding page if required. Keep a File Manager/terminal
   session available; the Admin portal is not used for this installation.
3. Enable File Manager's **Show Hidden Files**. Move/rename the old `.next` into the
   verified backup location. Extract the full ZIP into the exact application root,
   so `.next/BUILD_ID`, `app.js`, `next.config.js`, `package.json`, `package-lock.json`,
   `public/`, `src/`, `prisma/` and `database/` sit directly under that root.
   Avoid an extra nested `trakovo/` folder and avoid merging new chunks into an old
   `.next`. Keep private environment files and external uploads untouched.
4. In **Setup Node.js App**, select patched **Node 24.22.1+ (24.x)**, production mode
   and startup file `app.js`. Preserve the recorded environment variables. Keep the
   app stopped while build/configuration and dependencies are being replaced; if the
   panel automatically restarts during a runtime change, stop it again before continuing.
5. Click **Run NPM Install** using the newly extracted package.json **and lockfile**.
   Wait for successful completion. cPanel manages its node_modules link/environment:
   do not replace that link with a local Windows node_modules folder. If the provider
   runs the install for you, use its supported Node environment and the supplied
   lockfile. No server-side build is needed; the ZIP contains the compiled build.
6. If terminal access is available, activate the exact environment displayed by cPanel
   and verify `node --version` and `npm ls --omit=dev next react react-dom sharp mysql2
   nodemailer adm-zip axios js-cookie`. Expected release versions: Node 24.22.1+, Next
   16.4.3, React/React DOM 19.3.1, sharp 0.35.5, mysql2 3.24.6, Nodemailer 10.2.1,
   adm-zip 0.6.1, Axios 1.20.0 and js-cookie 3.0.8 (or a reviewed later lockfile).
7. **Start/restart Passenger** only after SQL, files and NPM installation succeed.
   Confirm the running application uses the selected Node environment and watch its
   startup/error log. PHP worker/panel restarts are separate provider tasks.

If an install or startup step fails, keep the app stopped and use the rollback below.
Do not try to repair the transition with an OTA upload of this full ZIP.

### 4. Focused post-deployment checks — owner

- [ ] Admin login, vendor login and driver login/logout work; unauthorised portal/API
      requests remain blocked. Admin → Settings → Updates reports v1.19.0.
- [ ] Desktop and mobile navigation show Special Occasions, Corporate Events, Services,
      Our Fleet and Contact; desktop also has View Fleet. Occasion dropdown links open
      the matching sections. Corporate Events opens Professional Services.
- [ ] Special Occasions reads correctly with no selected vehicles. Submit a real test
      enquiry and confirm its event details in Admin → Enquiries → Contact Enquiries,
      plus notification at the configured admin address. Mail failure must not lose
      the saved enquiry. Clean up the test enquiry through the normal admin process.
- [ ] In Admin → Vehicles, choose appropriate vehicles with **Feature on homepage**
      and **Show on Special Occasions**. Both default off, so the homepage showcase
      starts empty until selections are made; the ordinary fleet remains available.
- [ ] Leave the wheelchair accessible vehicle unfeatured. If it is unavailable for hire,
      turn **Vehicle is active** off. Verify it disappears from homepage, event showcase,
      public fleet and direct public detail pages. Do not deactivate an operational
      vehicle merely to stop homepage promotion; use its feature switch for that.
- [ ] Select an active public event vehicle, verify its image/name and enquiry preference.
      Turn active/public visibility off and confirm it disappears even if showcase switches
      remain selected. Restore the operational configuration after checking.
- [ ] Check one standard hire submission, pricing/availability and confirmation. Carry
      forward the v1.17 on-the-day licence-verification check if not already deployed.
- [ ] Taxi still uses the configured phone booking dialog (default 0488 838 442).
      Leave online taxi bookings off unless separately launched. Vendor taxi unchanged.
- [ ] Confirm uploaded media and existing customer documents remain accessible only
      through their intended routes/permissions; check existing email sending and updater UI.
- [ ] Confirm NEXT_PUBLIC_SITE_URL is correct; the sitemap includes the new page. Request
      search reindexing if appropriate. Confirm provider CVE evidence and service restarts.

Record the actual deployed version/date and clear only completed items after the owner
confirms installation and checks. Production has not been accessed by this release work.

### Rollback

Stop the application. Restore the **matching old .next, root configuration, app.js,
package.json, package-lock.json and dependency environment** from backup; if dependencies
must be installed again, use the old lockfile in the recorded compatible environment.
Restore the old Node selection only if it is a patched supported runtime; involve the
provider if the old setup relied on an unsupported runtime. Keep host PHP/cPanel security
patches in place. Restart and check login/bookings. Do not use the Admin .next-only
rollback across this framework/dependency transition.

The new SQL is additive: leave the three boolean columns in place when rolling back
application code. Do not drop columns, reset the database or undo unrelated billing data.

### Changelog and history

- New `/special-occasions`, occasion navigation, event enquiries and opt-in vehicle showcases.
- Updated Next.js/React/runtime dependencies, request APIs, enquiry validation and ZIP guards.
- Manual host security review: `SECURITY-REVIEW-2026-10-26.md`.
- Previous deployment state retained in `docs/archive/PENDING-DEPLOY-v1.18.1.md`.
- v1.15.3 was last owner-confirmed on 12 October; v1.16/v1.17/v1.18.1 were published
  with installation still pending at that confirmation. v1.18.0 was withdrawn.
