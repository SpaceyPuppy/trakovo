# cPanel Deployment Guide

This app runs on Node.js via **CloudLinux Phusion Passenger**, which cPanel uses to manage
Node.js applications on shared hosting. Passenger handles process management and restarts.

---

## Prerequisites

- cPanel hosting with **Node.js support** (Setup Node.js App must be available)
- cPanel hosting with **MySQL support** (MySQL Databases + phpMyAdmin)
- Node.js **18.x** available on the server (v20 may cause issues on some hosts)
- Node.js 18+ installed on your **local machine** for building

---

## 1. Build the app locally

Run this in the project folder on your local machine:

```bash
npm install
npx prisma generate
npm run build
```

This creates the `.next/` folder and generates Linux Prisma engine binaries into
`node_modules/.prisma/client/`. Both must be uploaded to the server.

To create the deployment zip, run the PowerShell build script:

```powershell
powershell -ExecutionPolicy Bypass -File "make-zip.ps1"
```

---

## 2. Create the MySQL database

1. Log in to cPanel
2. Go to **Databases → MySQL Databases**
3. Create a new database (e.g. `myusername_trakovo`)
4. Create a new database user with a strong password
5. Add the user to the database with **All Privileges**
6. Note the database name, username, and password — needed for `DATABASE_URL`

---

## 3. Create the database tables

1. Open **phpMyAdmin** from cPanel
2. Select your newly created database on the left
3. Click the **Import** tab
4. Choose `prisma/init.sql` from the uploaded app folder
5. Set encoding to **utf8** and click **Go**

> You only need to do this once. The app does not run migrations automatically.

---

## 4. Create the Node.js app in cPanel

1. Go to **Software → Setup Node.js App**
2. Click **Create Application**

| Field | Value |
|-------|-------|
| Node.js version | **18.x** |
| Application mode | `production` |
| Application root | `trakovo` (relative to home, e.g. `/home/youruser/trakovo`) |
| Application URL | Your domain (e.g. `ckb.services`) |
| Application startup file | `app.js` |

3. Click **Create** — do not run npm install yet

---

## 5. Upload files to the server

Extract the deployment zip and upload all contents to your app folder (e.g. `~/trakovo/`).

**What to upload from the zip:**

| Path | Notes |
|------|-------|
| `src/` | Source files |
| `public/` | Static assets |
| `prisma/` | Schema + init.sql |
| `.next/` | Built app — required |
| `app.js`, `next.config.js`, `package.json`, etc. | Root config files |
| `node_modules/.prisma/client/` | Pre-built Prisma Linux binaries |
| `node_modules/@prisma/client/` | Prisma client shell |

**Do NOT upload:**
- `.env` or `.env.local` (set secrets via cPanel UI instead)
- `.git/`
- `uploads/` (create a separate persistent folder — see step 8)

---

## 6. Run NPM Install

In cPanel → **Setup Node.js App** → your app → click **"Run NPM Install"**.

> **Important:** This does two things:
> 1. Installs all packages into the nodevenv virtual environment
> 2. Creates `~/trakovo/node_modules` as a **symlink** to the nodevenv
>
> The symlink means uploads to `~/trakovo/node_modules/` go directly into the nodevenv.
> **Never delete or rename this symlink** — if you do, re-run NPM Install to recreate it.

Alternatively, in cPanel Terminal:
```bash
cd ~/trakovo && npm install --omit=dev --ignore-scripts
```
- `--omit=dev` skips ESLint, TypeScript, etc. not needed at runtime
- `--ignore-scripts` prevents `prisma generate` from running (it would fail — pre-built binaries are uploaded instead)

---

## 7. Upload Prisma client binaries

After npm install creates the `node_modules` symlink, upload (or copy) the Prisma client:

Via cPanel File Manager: upload `node_modules/.prisma/client/` from the zip into
`~/trakovo/node_modules/.prisma/client/`

Because `node_modules` is a symlink to the nodevenv, the files land in the right place automatically.

Verify the binary is there in Terminal:
```bash
ls ~/trakovo/node_modules/.prisma/client/*.so.node
```
You should see `libquery_engine-rhel-openssl-1.0.x.so.node` (and possibly others).

---

## 8. Fix file permissions

After uploading, set correct permissions:

```bash
find ~/trakovo -type d -exec chmod 755 {} \; 2>/dev/null
find ~/trakovo -type f -exec chmod 644 {} \; 2>/dev/null
chmod 755 ~/trakovo/node_modules/.prisma/client/*.so.node 2>/dev/null
```

The `.so.node` binary needs execute permission to be loaded by Node.js.

---

## 9. Create the uploads folder

Create a folder **outside** your app directory so uploads survive redeployments:

```bash
mkdir -p ~/trakovo-uploads
chmod 755 ~/trakovo-uploads
```

Set `UPLOAD_DIR` to the full path (e.g. `/home/youruser/trakovo-uploads`) in step 10.

---

## 10. Set environment variables

In cPanel → **Setup Node.js App** → your app → **Environment Variables**:

### Required

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `mysql://dbuser:dbpassword@localhost:3306/myusername_trakovo` |
| `ADMIN_JWT_SECRET` | Long random string — generate with `openssl rand -hex 32` |
| `ADMIN_USERNAME` | Your admin login username |
| `ADMIN_PASSWORD` | Your admin login password |
| `VENDOR_JWT_SECRET` | Another long random string (different from admin secret) |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com` |
| `UPLOAD_DIR` | `/home/youruser/trakovo-uploads` |

### HTTPS / Cookie security

| Key | Value | Notes |
|-----|-------|-------|
| `COOKIE_SECURE` | `false` | Set this if your site is HTTP-only (see HTTPS section below). Remove it once HTTPS is working. |

### Branding (optional)

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SITE_NAME` | Public-facing site name (default: `Trakovo`) |
| `NEXT_PUBLIC_ADMIN_NAME` | Admin portal label (default: `Hire Manager`) |

> These can also be changed under **Admin → Settings → Site Branding** without redeploying.

### Email — SMTP (optional)

| Key | Value |
|-----|-------|
| `SMTP_HOST` | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | Sending email address |
| `SMTP_PASS` | Email app password |
| `SMTP_FROM` | e.g. `Bookings <bookings@yourdomain.com>` |

### Email — Microsoft 365 (optional, takes priority over SMTP)

| Key | Value |
|-----|-------|
| `MS_CLIENT_ID` | Azure app client ID |
| `MS_CLIENT_SECRET` | Azure app client secret |
| `MS_TENANT_ID` | Azure tenant ID |

### Web Push Notifications (optional)

| Key | Value |
|-----|-------|
| `VAPID_PUBLIC_KEY` | Generate with `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | (from above) |
| `VAPID_SUBJECT` | `mailto:admin@yourdomain.com` |

### Maintenance / Development mode (optional)

| Key | Value |
|-----|-------|
| `MAINTENANCE_MODE` | `true` to show maintenance page to public |
| `DEVELOPMENT_MODE` | `true` to show "coming soon" page |
| `MAINTENANCE_PASSWORD` | Bypass password for admin access during lock |

---

## 11. Start the application

In cPanel → **Setup Node.js App** → click **Restart**.

Or from Terminal:
```bash
touch ~/trakovo/tmp/restart.txt
```

Visit your domain — the home page should load.

---

## 12. Access the admin panel

Go to `http://your-domain.com/admin` (or `https://` once SSL is working).

Log in with the `ADMIN_USERNAME` and `ADMIN_PASSWORD` set in step 10.

---

## HTTPS on cPanel + LiteSpeed

On some cPanel hosts using LiteSpeed, HTTPS gives a 503 even after AutoSSL runs.
This is because the LiteSpeed SSL virtual host is not automatically configured to proxy
to the Node.js/Passenger app — only the HTTP vhost is.

**Workaround options:**

### Option A — Cloudflare (recommended)
1. Sign up at cloudflare.com → Add your domain
2. Update your domain's nameservers at your registrar to Cloudflare's
3. In Cloudflare → **SSL/TLS** → set to **Flexible** (Cloudflare handles HTTPS, proxies HTTP to origin)
4. Set `COOKIE_SECURE=false` in your env vars (cookies travel over HTTP between Cloudflare and origin)
5. Done — users see HTTPS, your app runs on HTTP

### Option B — Contact hosting support
Ask them to ensure the Node.js/Passenger proxy is configured on the SSL virtual host:
> "My Node.js app works on HTTP but returns 503 on HTTPS. The HTTPS virtual host for
> [domain] is not proxying to the Passenger application. Can you ensure AllowOverride All
> and the Passenger configuration are applied to the SSL vhost?"

### Option C — HTTP only (temporary)
Set `COOKIE_SECURE=false` and use the site over HTTP while you resolve HTTPS.
Not suitable for production with real customer data.

---

## Updating the site

When you make code changes locally:

1. Run `npm run build` locally
2. Re-run the zip build script
3. Upload updated files — at minimum `.next/` and any changed source files
4. If Prisma schema changed: regenerate `prisma/init.sql` and apply changes via phpMyAdmin
5. If `package.json` dependencies changed: also re-upload `node_modules/.prisma/client/` and re-run npm install
6. Fix permissions (step 8) after each upload
7. Restart: `touch ~/trakovo/tmp/restart.txt`

---

## Data that persists between deployments

### MySQL database
All booking, vehicle, vendor, and settings data lives in MySQL.
Not affected by redeployments — only app files change.

Back up regularly via **phpMyAdmin → Export** (SQL format) or **cPanel → Backup**.

### Uploads folder
As long as `UPLOAD_DIR` points outside the app directory, uploaded files survive redeployments.

---

## Troubleshooting

**503 Service Unavailable**
- Run `node app.js` in cPanel Terminal to see the startup error
- Check that `node_modules` is still a symlink: `ls -la ~/trakovo/ | grep node_modules`
- If the symlink is broken/missing: go to Setup Node.js App → Run NPM Install to recreate it
- Check file permissions — `.next/` and `.so.node` binaries need to be readable

**Prisma: "Could not locate the Query Engine for runtime rhel-openssl-1.0.x"**
- The Prisma Linux binary wasn't uploaded or is in the wrong location
- Ensure `node_modules/.prisma/client/libquery_engine-rhel-openssl-1.0.x.so.node` exists
- Ensure the file has execute permission: `chmod 755 ~/trakovo/node_modules/.prisma/client/*.so.node`

**WebAssembly memory error at startup (undici)**
- This is a known issue on shared hosting with memory restrictions
- It is handled in `app.js` — the app continues running normally

**Cookies not being set / login not working**
- If on HTTP: set `COOKIE_SECURE=false` in environment variables
- If on HTTPS: ensure the SSL vhost is properly configured (see HTTPS section)
- Check there are no leading/trailing spaces in env var values

**Admin login returns "Invalid credentials"**
- Verify `ADMIN_USERNAME` and `ADMIN_PASSWORD` match exactly (case-sensitive, no spaces)
- Check in Terminal: `echo "user: '$ADMIN_USERNAME' pass: '$ADMIN_PASSWORD'"`

**"Cannot find module" error**
- `node_modules` symlink is missing — run NPM Install via Setup Node.js App
- Do not upload a real `node_modules` folder — it must be the cPanel-managed symlink

**Permission denied on files**
- Run the chmod commands in step 8 after every upload

**App lock / "Can't acquire lock on app"**
```bash
pkill -f "node app.js"
touch ~/trakovo/tmp/restart.txt
```

**Database connection error**
- Verify `DATABASE_URL` format: `mysql://user:pass@localhost:3306/dbname`
- Confirm the database user has All Privileges on the database
- Test credentials in phpMyAdmin

**Tables don't exist / 500 on first load**
- Import `prisma/init.sql` via phpMyAdmin before starting the app

**File uploads failing**
- Ensure `UPLOAD_DIR` path exists and is writable: `chmod 755 ~/trakovo-uploads`

---

## Notes

- `ecosystem.config.js` and `nginx.conf.example` are for VPS/PM2 deployments — ignore for cPanel
- Passenger restarts the app automatically if it crashes
- cPanel's "Run NPM Install" button installs packages AND creates the `node_modules` symlink — it is safe to re-run at any time
