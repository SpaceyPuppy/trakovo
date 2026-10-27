# Trakovo v1.20.2 — Account access and Microsoft/OTA connection recovery

The mobile Admin account avatar now opens the same Settings, Profile, View site and
Sign out dropdown as desktop. The hamburger still opens navigation. The dropdown
supports Escape/outside dismissal; sign-out checks the server response and refreshes
the session state after success. A failed sign-out remains visible and can be retried.

Public fleet and booking-app cards again show **Chauffeur Only** when self-drive is
unavailable, retaining the green **Self-Drive** badge on eligible vehicles. Category
assignments and the four service buttons from v1.20.1 remain in place; the removed
built-in Chauffeur Only browsing filter is not restored.

Microsoft token exchange/refresh, mailbox/calendar lookup, mail and calendar writes use
bounded native Node HTTPS requests, avoiding the fetch/undici WASM parser used by the
previous paths. TLS verification remains enabled. The callback validates configuration,
state ownership/expiry and token payloads, then returns to Connections with actionable
errors for transport, provider, profile or storage failures. A complete connection is
saved together; OAuth codes, secrets, tokens and raw provider descriptions are not logged.
The exact redirect URI is retained from the start of each sign-in. Reconnecting a
different mailbox clears the old calendar selection.

Access-token refresh remains coalesced. A Graph HTTP 401 can trigger one refresh/retry;
ambiguous mail/event network failures are not replayed automatically. Calendar access
failures now display an error and Needs attention instead of a successful empty list.
The UI checks disconnect responses and provides a Reconnect with Microsoft action.

GitHub update checks and asset downloads also use bounded native HTTPS, including
allowlisted download redirects without forwarding repository credentials to the CDN.
Connection errors include safe diagnostic codes. TLS verification stays enabled, and
the existing OTA archive validation, permission handling and backup remain in place.
This follows GitHub's [release asset download protocol](https://docs.github.com/en/rest/releases/assets?apiVersion=2022-11-28).

Public contact, Special Occasions, corporate and booking-enquiry admin emails now set
the enquirer's email as Reply-To in Microsoft Graph and SMTP, retaining the authorised
sender. Corporate enquiries are saved through the shared website inbox before email;
mail failure leaves them available to staff. Admin -> Enquiries now displays website
and booking enquiries together, including historical corporate records. Existing
records are read in place; no migration or duplication is needed. Mark-read updates
check the server response and target the correct record source.

## Installation and Microsoft checks

Install **next-bundle-v1.20.2.zip** through Admin -> Settings -> Updates -> Manual Deploy
while the old GitHub checker is failing. Back up the database, .next and package.json first. No new
SQL, dependencies, environment variables or cron jobs are introduced; retain the patched
Node 24.22.1+ (24.x) runtime and previously applied v1.20 schema/category repair.

After deployment, sign in afresh and check the mobile account menu, sign-out and both
vehicle badges. In Admin -> Settings -> Connections, start a **new** Microsoft connection;
do not reload the old failed callback URL or reuse its one-use authorization code.
Verify the existing MS_CLIENT_ID, MS_TENANT_ID and MS_CLIENT_SECRET in cPanel, including
the secret VALUE and expiry. Check General -> Site URL is https://ckb.services and the
Microsoft app registration has the exact **Web** redirect URI:

`https://ckb.services/api/admin/settings/ms-callback`

Existing delegated scopes are Mail.Send, User.Read, Calendars.ReadWrite and offline_access.
Complete consent as required by the tenant, then select the intended calendar and send
a test email. Verify an affected booking's calendar sync before relying on it. See
[Microsoft's authorization-code documentation](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
and [Graph authorization troubleshooting](https://learn.microsoft.com/en-us/graph/resolve-auth-errors).

Submit one of each public enquiry type, verify its details in Admin -> Enquiries and
check that Reply in the received notification targets the enquirer. Historical
corporate enquiries should also appear. No automatic replay of old notifications occurs.

The owner reports `TypeError: fetch failed` for Microsoft refresh and OTA checks. This
does not identify the underlying host/network cause. If the callback still fails,
inspect the safe stage/code in the application log; if no callback log is
produced, have the provider inspect Passenger/web-server/ModSecurity handling of that
path. Outbound DNS/TLS/HTTPS access to login.microsoftonline.com and graph.microsoft.com
must work. Do not disable TLS checks or publish complete callback URLs or token payloads.
After installation, also verify Check for updates. GitHub network errors include a code;
ask the host to inspect outbound access to api.github.com and GitHub's release asset
hosts if needed. HTTP_401/403/404 may require checking GITHUB_TOKEN repository access,
rate limits or release availability. Do not share credentials or signed download URLs.

Real Microsoft consent, email delivery and production sync remain owner checks. Missed
emails/events are not bulk-replayed by this update. For rollback, restore the previous
.next and matching package.json; retain database repairs and host security patches.
