# Trakovo security review — 26 October 2026

Scope: the repository's locked application dependencies and vendor advisories relevant
to its cPanel / CloudLinux / Passenger deployment. This is not a server penetration
test. Production versions, host package revisions and compromise status have not been
verified. A clean dependency audit does not establish that a server is uncompromised.

## Additional finding: credentials in public Git history

The public repository tracks `.env.local` with populated DB password, master admin
password, admin/vendor JWT secrets, Microsoft OAuth client secret and maintenance
password fields. A legacy `.env` is also tracked. Values were inspected only through
redacted classification and are not reproduced here. Their production applicability
has not been verified. Current tracking is removed and private files are ignored while
local copies are retained. **This does not remove historical copies or revoke a key.**

Treat historical credentials as exposed. The owner/provider must rotate/revoke any
matching credentials in every live service that used them, update private deployment
configuration, invalidate affected sessions and inspect relevant access logs. Check
SMTP and other keys as well; restrict the public Mapbox token to intended domains.
History rewriting is not performed: it would require coordinated, separately authorised
destructive Git changes and would still not replace credential rotation.

Production portal signing now fails closed for missing secrets and the known development
fallback values. Configure all three existing JWT secret variables before installation.
These are existing variables, not new environment requirements.

## Host actions — required independently of the Trakovo package

Ask the hosting provider for a written inventory and confirmation of the following.
Do not delay host patching until the website release is installed.

1. **CVE-2026-109618 and CVE-2026-109619 (PHP2Shell):** update cPanel's internal PHP
   and every installed EasyApache and CloudLinux alt-PHP / PHP Selector variant.
   PHP upstream fixes are 8.2.35, 8.3.36, 8.4.27 and 8.5.12. Distributions may backport
   the fix without changing the base PHP version: verify the complete package release
   and vendor changelog, not just `php -v`. cPanel lists fixed WHM builds including
   11.110.0.153, 11.134.0.66, 11.136.0.50 and 11.138.0.18; use the latest patched build
   on the host's supported branch. Restart/reload affected PHP workers and panel
   services through the provider's supported procedure. Trakovo itself is Node.js,
   but PHP applications and panel services on the same host still need remediation.
2. **Emerging CVE-2026-115560:** follow PHP's 23 October advice to disable
   `session.upload_progress.enabled` (`0`) pending the regular bugfix release, unless
   the provider can establish that the unusual serializer-change prerequisite is
   absent or that its build includes the complete fix. Apply to the relevant PHP
   runtime configurations and restart workers. This is a PHP setting; it does not
   disable Trakovo's Node.js document uploads. This precaution does not replace the
   patches for the two original PHP CVEs.
3. **Node.js CVE-2026-111497 and the October DNS/TLS/HTTP fixes:** select a maintained,
   patched Node runtime for the actual Passenger application. This release standardises
   on Node **24.22.1 or later in the 24.x line**. Selecting a different PHP version or
   changing package.json does not update Passenger's Node binary. Confirm its running
   version after restart. Review provider backports where applicable. CVE-2026-111497
   requires decompression of attacker-controlled Brotli data; patch the runtime even
   if a direct application path has not been demonstrated.
4. Confirm current security updates for the supported CloudLinux/OS, Apache/LiteSpeed,
   Passenger, OpenSSL, MySQL/MariaDB and installed cPanel components (including WP
   Toolkit if present). Review vendor advisories against the actual inventory. Remove
   unused exposed services/runtimes where the provider supports doing so. Confirm
   account isolation, backups and the host's WAF/rate-limit rules for public submissions.
5. Review access and service logs for suspicious requests, unexpected executable files,
   worker crashes and unauthorised account changes. If there is evidence of compromise,
   have the provider contain and investigate it, rebuild from trusted material, and
   rotate affected database, mail, OAuth and session credentials. Patching alone does
   not remove a compromise. Routine credential rotation is not claimed as a CVE fix.

Provider evidence needed: package names and full revisions; applied advisories; restart
times; Node version actually used by Passenger; and outstanding exceptions. The owner
must confirm these before recording host remediation as complete.

## Application changes in v1.19.0

- Replace unsupported Next.js 14.2.35 with a supported patched release and align React,
  linting and async request APIs. Next.js's 14 October bulletin includes
  CVE-2026-96889 (image-processing RCE on glibc Linux), GHSA-673q-mjm6-r5xr
  (`use cache` typed-array RCE) and GHSA-p3m5-59mp-jv5r (Server Actions denial of
  service). Feature prerequisites differ. No `use cache` or Server Action implementations
  were found in Trakovo; the installed server image library still needs host verification.
  The old lockfile did not include sharp. We do not assert every advisory is exploitable
  on this installation.
- Use a patched sharp package. Remove the unrestricted remote-image proxy configuration;
  existing fleet images use ordinary browser image elements. Retain a bounded Server
  Actions body setting. Public upload endpoints continue to operate separately.
- Update affected runtime dependencies, including the OTA ZIP library, database driver,
  mail transport, HTTP client and cookie helper; refresh affected transitive dependencies.
  Initial runtime audit: 12 flagged packages (1 critical, 9 high, 2 moderate).
  Final local audit after remediation: **zero known vulnerabilities across all
  dependencies**, including development dependencies (26 October 2026).
- Resolve Next's asynchronous parameters and cookie APIs across the existing portals;
  preserve API authentication while upgrading the framework.
- Switch to Next.js 16's proxy convention for the existing portal guard. Keep Tailwind
  3 and override its selector parser to the patched 7.1.6+ API; verify the production CSS
  build and visual layout. ESLint 9.39.5 remains a development-only compatibility
  dependency because the current Next lint plugins declare ESLint 9 peer support;
  npm marks that tooling line deprecated. It is not a production server dependency.
- Validate and bound event/contact enquiry input, escape customer text in enquiry email,
  and save enquiries before attempting notification delivery. Event submissions include
  a honeypot and recheck a preferred vehicle's current public/showcase eligibility.
- Deliver this release by **full-package installation**. A .next-only OTA does not
  replace the server's Node runtime, node_modules, lockfile, root configuration or
  public assets. No OTA asset is published for this release, by the owner's decision.

## Primary sources

- [PHP security announcement and 23 October follow-up](https://www.php.net/archive/2026.php)
- [cPanel patch versions and verification](https://support.cpanel.net/hc/en-us/articles/44397389677335-Critical-PHP-Security-Release-CVE-2026-109618-and-CVE-2026-109619)
- [CloudLinux PHP advisory](https://blog.cloudlinux.com/php-cve-2026-109618-and-cve-2026-109619)
- [Node.js October 2026 security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
- [Next.js support policy](https://nextjs.org/support-policy)
- [Next.js 14 October security bulletin](https://nextjs.org/blog/nextjs-security-update-october-14-2026)
- [Next.js image-processing advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw)

Recheck the applicable vendor advisories immediately before installation. New reports
after this dated review require another assessment; no ongoing monitoring has been set up.
