# Archived: v1.3.0 Migration Plan — Prisma → mysql2

> Historical record only. This migration is complete. Current architecture and deployment
> guidance live in `../ARCHITECTURE.md` and `../DEPLOYMENT.md`.

## Status: COMPLETE — build passing, ready to deploy

---

## What was done

Replaced Prisma ORM entirely with raw `mysql2` (pure JS, no binary engine).
Root cause: Prisma's Rust binary engine panics on cPanel shared hosting (`PrismaClientRustPanicError: timer has gone away`).

### All migrated files

**lib**
- `src/lib/db.ts` — new mysql2 pool + `query<T>()`, `queryOne<T>()`, `execute()`, `newId()`, `generatePublicId()`

**Admin API routes** (all `prisma.*` → raw SQL)
- `src/app/api/admin/login/route.ts`
- `src/app/api/admin/settings/route.ts`
- `src/app/api/admin/settings/logo/route.ts`
- `src/app/api/admin/push/subscribe/route.ts`
- `src/app/api/admin/settings/gc-auth/route.ts`
- `src/app/api/admin/settings/gc-callback/route.ts`
- `src/app/api/admin/settings/gc-disconnect/route.ts`
- `src/app/api/admin/settings/ms-auth/route.ts`
- `src/app/api/admin/settings/ms-callback/route.ts`
- `src/app/api/admin/settings/ms-disconnect/route.ts`
- `src/app/api/admin/bookings/[id]/route.ts`
- `src/app/api/admin/bookings/[id]/notes/route.ts`
- `src/app/api/admin/bookings/[id]/notes/[noteId]/route.ts`
- `src/app/api/admin/bookings/[id]/send-quote/route.ts`
- `src/app/api/admin/bookings/[id]/status/route.ts`
- `src/app/api/admin/vehicles/route.ts`
- `src/app/api/admin/vehicles/[id]/route.ts`
- `src/app/api/admin/vendors/route.ts`
- `src/app/api/admin/vendors/[id]/route.ts`
- `src/app/api/admin/vendors/[id]/password/route.ts`
- `src/app/api/admin/vendors/[id]/vehicles/route.ts`
- `src/app/api/admin/drivers/route.ts`
- `src/app/api/admin/drivers/[id]/route.ts`
- `src/app/api/admin/drivers/[id]/password/route.ts`
- `src/app/api/admin/drivers/[id]/messages/route.ts`

**Vendor API routes**
- `src/app/api/vendor/login/route.ts`
- `src/app/api/vendor/bookings/route.ts`
- `src/app/api/vendor/bookings/[id]/route.ts`
- `src/app/api/vendor/clients/route.ts`
- `src/app/api/vendor/clients/[id]/route.ts`
- `src/app/api/vendor/vehicles/route.ts`
- `src/app/api/vendor/support/route.ts`
- `src/app/api/vendor/support/[id]/route.ts`

**Driver API routes**
- `src/app/api/driver/login/route.ts`
- `src/app/api/driver/bookings/route.ts`
- `src/app/api/driver/bookings/[id]/route.ts`
- `src/app/api/driver/bookings/[id]/notes/route.ts`
- `src/app/api/driver/messages/route.ts`

**Public API routes**
- `src/app/api/booking/route.ts`
- `src/app/api/booking/upload-id/route.ts`
- `src/app/api/vehicles/available/route.ts`
- `src/app/api/logo/route.ts`

**Page components**
- `src/components/ui/NavWrapper.tsx`
- `src/app/book/page.tsx`
- `src/app/book/[slug]/page.tsx`
- `src/app/admin/bookings/[id]/page.tsx`
- `src/app/admin/settings/page.tsx`
- `src/app/admin/settings/connections/page.tsx`
- `src/app/admin/settings/templates/page.tsx`
- `src/app/admin/vendors/page.tsx`
- `src/app/admin/vendors/[id]/page.tsx`
- `src/app/admin/drivers/page.tsx`
- `src/app/vendor/page.tsx`
- `src/app/vendor/bookings/page.tsx`
- `src/app/vendor/bookings/[id]/page.tsx`
- `src/app/driver/page.tsx`
- `src/app/driver/bookings/page.tsx`

**Config**
- `package.json` — removed `@prisma/client` + `prisma` deps, removed `postinstall: prisma generate`, bumped to v1.3.0
- `.env.example` — replaced `DATABASE_URL` with `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

---

## Deployment steps (cPanel shared hosting)

1. **Update `.env`** on the server — replace `DATABASE_URL=mysql://...` with:
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=your_db_name
   ```

2. **Upload new files** (zip deploy or git pull)

3. **Delete old Prisma engine binaries** from `node_modules/.prisma` and `node_modules/@prisma` if present (saves disk space, no longer needed)

4. **Run `npm install`** in cPanel Node.js app manager
   - No `--ignore-scripts` needed anymore (no `prisma generate`)
   - No OOM risk

5. **Restart the Node.js app** in cPanel

6. **No database schema changes** required for this release — all tables unchanged

---

## Key patterns used in mysql2 migration

```typescript
// query returns Row[]
const rows = await query<{ id: string; name: string }>('SELECT id, name FROM Foo WHERE bar = ?', [val])

// queryOne returns T | null
const row = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM Foo', [])

// execute for INSERT/UPDATE/DELETE
await execute('UPDATE Foo SET name = ? WHERE id = ?', [name, id])

// newId() — crypto.randomUUID()
// generatePublicId('PRE') — 'PRE-XXXXXXXX'

// Upsert pattern
await execute('INSERT INTO Setting (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)', [key, val])

// IN clause — pass array as nested element
await query('SELECT * FROM Foo WHERE id IN (?)', [ids])

// Boolean conversion (mysql2 returns TINYINT as 0/1)
const isActive = Boolean(row.is_active)
```
