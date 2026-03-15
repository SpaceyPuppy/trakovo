# Trakovo — Claude Context

Fleet management platform for bookings, vehicles, drivers, vendors, and dispatch.

## Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** MySQL via raw `mysql2` — no Prisma ORM (removed in v1.3.0 due to cPanel binary panics)
- **Auth:** JWT cookies — separate secrets for admin, vendor, driver
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Hosting:** cPanel shared hosting (CloudLinux + Phusion Passenger)

## Project structure

```
src/
  app/
    api/
      admin/      — admin API routes
      vendor/     — vendor portal API routes
      driver/     — driver portal API routes
      booking/    — public booking API
      vehicles/   — public vehicle availability
      logo/       — public logo endpoint
    admin/        — admin portal pages
    vendor/       — vendor portal pages
    driver/       — driver portal pages
    book/         — public booking pages
  components/
    ui/           — shared UI components
  lib/
    db.ts         — mysql2 pool + query/queryOne/execute/newId/generatePublicId helpers
  middleware.ts   — JWT auth for portal routes
prisma/
  init.sql        — full schema SQL (used to create tables on fresh deploy — no migrations)
```

## Database patterns (mysql2)

```typescript
// query returns Row[]
const rows = await query<{ id: string }>('SELECT id FROM Foo WHERE bar = ?', [val])

// queryOne returns T | null
const row = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM Foo', [])

// execute for INSERT/UPDATE/DELETE
await execute('UPDATE Foo SET name = ? WHERE id = ?', [name, id])

// newId() — crypto.randomUUID()
// generatePublicId('PRE') — 'PRE-XXXXXXXX'

// Upsert
await execute('INSERT INTO Setting (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)', [key, val])

// IN clause
await query('SELECT * FROM Foo WHERE id IN (?)', [ids])

// Boolean conversion (mysql2 returns TINYINT as 0/1)
const isActive = Boolean(row.is_active)
```

## Key rules

- **No Prisma** — all DB access is raw SQL via mysql2. Do not introduce Prisma.
- **No ORM** — write raw SQL queries using the helpers in `src/lib/db.ts`.
- Schema changes require manually updating `prisma/init.sql` and applying via phpMyAdmin.
- The app does not run migrations automatically.
- Uploads live outside the app dir at `UPLOAD_DIR` (env var) so they survive redeployments.

## Deployment

See `DEPLOYMENT-CPANEL.md` for full detail. Short version:

1. `npm run build` locally
2. `powershell -ExecutionPolicy Bypass -File "make-zip.ps1"` to create the deploy zip
3. Upload zip to cPanel, extract into app folder
4. cPanel → Setup Node.js App → Run NPM Install → Restart

## Dev workflow

See `DEV-WORKFLOW.md`. Short version:

```bash
npm run dev          # local dev server
npm run build        # check for build errors before committing
git add .
git commit -m "..."
git push
```

Version in `package.json` — bump on meaningful releases (semver: MAJOR.MINOR.PATCH).

## Versioning history

- v1.4.x — vehicle ID control, POA pricing, day-range rates, OTA updates via adm-zip
- v1.3.x — Prisma → mysql2 migration, responsive admin sidebar, calendar views, vendor portals
- v1.2.x — early feature set

## Open TODOs

- Admin reset password flow via email auth (prevent unauthorized admin password reset)
