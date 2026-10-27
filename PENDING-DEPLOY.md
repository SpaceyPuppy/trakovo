# Pending Production Deployment

## Current pending version: v1.20.2

## v1.20.2 — released 27 October 2026 (owner installation pending)

[GitHub release](https://github.com/SpaceyPuppy/trakovo/releases/tag/v1.20.2) is published
from merge commit aef262a7b92c6a68ed73a89da745988f1ed9adf1 after PR #21 and both required
checks passed. Downloaded published assets were independently verified:

- OTA: next-bundle-v1.20.2.zip, 4,130,821 bytes, 1,035 entries.
  SHA-256: `691bcba11d1127e32550f28f1de09f633eaddd165183304d34c67cff63165b30`.
- Full: trakovo-v1.20.2.zip, 4,720,663 bytes.
  SHA-256: `18bd77670dc109c18f2c79d42689230f1c5a8c0c649c54f8783a50e3f6a3967c`.
- Both contain BUILD_ID 8IMMR7Iwctp6CwfIfjM9q with identical compiled build bytes.
  Existing updater archive validation passed. ZIP contents/paths and the six-value
  private credential scan passed. The published full package was compared with the
  v1.19.0 baseline: dependencies/locks apart from version labels, runtime, root/startup
  files and public assets are unchanged. OTA compatibility is verified.

CI passed all 60 regression tests, real MariaDB category checks, dependency audit,
lint (no errors; 15 existing warnings), type checks, production build and packaging.
An isolated browser preview confirmed the mobile/desktop account menu, sign-out and
protected-page redirect, restored vehicle badges, combined enquiry inbox and persisted
mark-read status. No more computer-use checks were run after the owner's usage request.
Live Microsoft consent, inbox receipt and production calendar sync remain owner checks.
Publication does not install this update on production. Packaged notes predate this
publication record; their installation and configuration instructions still apply.

### Scope

- Mobile Admin avatar opens the shared account menu with Settings, Profile, View site
  and Sign out. Hamburger navigation is separate. Escape/outside clicks close the
  account menu; logout errors remain visible and successful logout refreshes auth state.
- Restore Chauffeur Only badges for public vehicles without self-drive. Keep the green
  Self-Drive badge and v1.20.1 category/button assignments. No built-in chauffeur filter.
- Microsoft OAuth, refresh, Graph mail/calendar and calendar lookup use native Node
  HTTPS with a 15-second request deadline, 2 MiB response limit, verified TLS and a
  Microsoft host allowlist. No fetch/undici WASM dependency in these paths.
- Callback validates configuration, ten-minute admin-bound state and token payloads;
  uses the exact originally registered redirect URI; persists the complete connection
  together; returns to Connections with safe errors. It clears the selected calendar
  when the connected mailbox changes. Codes/tokens/provider descriptions are not logged.
- Calendar-list access failures now show an actionable error and Needs attention.
  Disconnect failures are not falsely reported as success. Graph requests retry once
  after HTTP 401/refresh, and do not replay ambiguous mail/event transport failures.
- GitHub OTA metadata and asset downloads also use native HTTPS. Metadata has a
  15-second deadline/2 MiB limit; assets have a 120-second deadline per hop/128 MiB
  limit and at most five allowlisted HTTPS redirects. Repository credentials go only
  to api.github.com. Safe network/HTTP codes replace Fetch failed/provider bodies.
- Public contact, Special Occasions, corporate and booking-enquiry admin notifications
  set Reply-To to the validated enquirer's email in both Microsoft Graph and SMTP.
  The authorised mailbox remains the sender. New corporate enquiries use the existing
  ContactEnquiry inbox with all event details retained; email failure does not erase them.
  The main Admin Enquiries screen shows website and booking enquiries, including old
  CorporateEnquiry records where that legacy table exists. Mark-read failures stay visible.

### Production state and prerequisites

Owner reports v1.20.1 installed, bookings present in the database and visible after a
fresh login. The earlier affected vendor still needs to confirm a fresh session. The
new report is mobile Admin logout unavailable and Microsoft connection failing, with
no emails/calendar sync and an HTTP 500 at the code callback. The owner supplied
`[microsoft-token] Refresh request failed [TypeError: fetch failed]` and reports the
same failure checking OTA updates. This identifies the shared fetch path, but not its
underlying DNS/TLS/parser/host cause. Native transport and callback handling address
these paths; live host connectivity and recovery remain owner verification steps.

The earlier FleetCategory InnoDB conversion and missing assignment table/Bus seed
repair succeeded according to the owner. Do not repeat that completed repair. Retain
all v1.20 SQL prerequisites, including Vehicle.enquiry_only; inspect the schema before
applying anything on another installation. Earlier release evidence and read-only
checks are archived in docs/archive/PENDING-DEPLOY-v1.20.1.md.

No new schema/dependency/cron/environment variables are required. Additional temporary
OAuth state fields use the existing Setting table. Existing MS_CLIENT_ID, MS_TENANT_ID
and MS_CLIENT_SECRET must be correct and available to Passenger. Node remains patched
24.22.1+ in the 24.x line. Root/startup and public files are unchanged: OTA is intended.

### Install — owner performed

1. Back up the database, current .next and package.json. Confirm the patched runtime,
   installed dependencies and completed v1.20 category/schema prerequisites.
2. Download next-bundle-v1.20.2.zip from the GitHub release and verify its published
   checksum. Use Admin -> Settings -> Updates -> Manual Deploy for this installation
   while the old GitHub checker is failing. After installation, check the new native
   GitHub path using Check for updates; a connectivity failure now includes a safe code.
3. The OTA swaps the build/manifest, sets permissions and restarts Passenger. No NPM
   installation or server build is required for this update. Publication is not deployment.
4. Confirm v1.20.2, sign in afresh and perform the checks below. Restore previous .next
   and matching package.json for rollback; existing one-click rollback restores only
   the build. Retain additive schema repairs and host security patches.

### Microsoft configuration and recovery

- [ ] In cPanel -> Setup Node.js App -> Environment variables, confirm MS_CLIENT_ID,
      MS_TENANT_ID and MS_CLIENT_SECRET. Use the secret VALUE, not its ID; check expiry.
      If changing an environment value, save and restart the application. Do not create
      a secrets file in the public website or share these values in screenshots/logs.
- [ ] General -> Site URL: https://ckb.services. In Microsoft Entra app registration,
      configure the Web redirect URI exactly as:
      https://ckb.services/api/admin/settings/ms-callback
      No query string, added trailing slash or SPA redirect type.
- [ ] Existing delegated scopes: Mail.Send, User.Read, Calendars.ReadWrite, offline_access.
      Complete tenant consent as required. Do not expand permissions to troubleshoot a
      network/storage failure. Official references:
      https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
      https://learn.microsoft.com/en-us/graph/resolve-auth-errors
- [ ] After OTA, open Settings -> Connections and choose Connect/Reconnect with Microsoft
      to start a fresh ten-minute sign-in flow. Do not reuse the failed callback URL/code.
      Confirm the mailbox, choose the intended calendar and save it. Changing accounts
      clears the old mailbox's calendar selection; reconnecting the same mailbox preserves it.
- [ ] Open the Microsoft panel and verify calendar loading succeeds. A stored connection
      alone is not proof of current access; failures display Needs attention and an alert.
- [ ] Send a test email and confirm actual inbox receipt. Confirm notification_email and
      booking email toggles if test mail works but booking notifications do not.
- [ ] Verify a booking calendar create/update against the intended Outlook calendar.
      Existing missed notifications/events are not bulk-replayed by this patch. Review
      affected bookings after the connection is proven; avoid duplicate customer emails.
- [ ] If a callback still errors, collect only the stage and diagnostic/provider code
      from application logs. Never share code/state/token values, complete callback URLs
      or client secrets. If no callback log appears, ask the provider to inspect Passenger,
      web-server and ModSecurity handling of /api/admin/settings/ms-callback. Confirm
      outbound HTTPS/DNS/TLS to login.microsoftonline.com and graph.microsoft.com; do not
      bypass certificate verification or disable host protections as a workaround.
- [ ] Check for updates succeeds after installation. If not, use its diagnostic code
      to ask the host about outbound HTTPS/DNS/TLS to api.github.com and GitHub release
      asset hosts (especially release-assets.githubusercontent.com). HTTP_401/403/404
      can require a valid GITHUB_TOKEN with repository read access, or indicate API
      rate limits/missing release; they are not evidence of a DNS or certificate fault.
      Manual Deploy remains available. Never share tokens or signed asset URLs.

### Portal and public verification

- [ ] On mobile, left hamburger opens navigation and right avatar opens Account options.
      Settings/Profile/View site/Sign out are accessible. Check outside tap and Escape;
      desktop retains the same account menu. A successful sign-out reaches Login and a
      refreshed protected page requires authentication. Failed sign-out offers a retry.
- [ ] Admin and affected vendor can see their bookings after a fresh login. No booking
      or availability/blockout data has been changed by this release.
- [ ] Submit a contact enquiry, a Special Occasions enquiry (including a preferred
      vehicle), a corporate enquiry and a booking waitlist enquiry. Each appears on
      Admin -> Enquiries with its details, and its admin email's Reply action targets
      the enquirer's email, while From remains the authorised mailbox. Confirm actual
      delivery after reconnecting Microsoft. Check historical corporate records and
      mark-read persistence. A mail failure must leave the saved enquiry in the inbox.
- [ ] Fleet and /book cards show green Self-Drive for hire_modes=both, otherwise Chauffeur
      Only. Chauffeur Only remains absent from the built-in category filters. Verify
      Enquiry Only still opens the occasion form with no calendar, and category mappings
      retain their v1.20.1 assignments.

### Remaining host/security follow-up

Retain the outstanding Mapbox rotation/restriction, coordinated historical secret cleanup
and provider confirmation of PHP/cPanel/CloudLinux/Passenger patches/restarts from the
previous deployment guide and SECURITY-REVIEW-2026-10-26.md. Do not infer full host
security or live Microsoft delivery from a compiled release or fixture tests alone.
