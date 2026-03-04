# cPanel Deployment Guide

This app runs on Node.js via **Phusion Passenger**, which cPanel uses to manage
Node.js applications. Passenger handles process management and restarts automatically.

---

## Prerequisites

- cPanel hosting with **Node.js support** (Setup Node.js App must be available)
- cPanel hosting with **MySQL support** (MySQL Databases + phpMyAdmin)
- Node.js 18.x or 20.x available on the server
- Node.js 18+ installed on your **local machine** for building

---

## 1. Build the app locally

Run this in the project folder on your local machine:

```bash
npm install
npm run build
```

This creates the `.next/` folder and also generates the Linux Prisma engine binaries
into `node_modules/.prisma/client/`. Both must be uploaded to the server.

---

## 2. Create the MySQL database

1. Log in to cPanel
2. Go to **Databases → MySQL Databases**
3. Create a new database (e.g. `myusername_trakovo`)
4. Create a new database user with a strong password
5. Add the user to the database with **All Privileges**
6. Note the database name, username, and password — you will need them for `DATABASE_URL`

---

## 3. Create the database tables

1. Open **phpMyAdmin** from cPanel
2. Select your newly created database on the left
3. Click the **Import** tab
4. Click **Choose File** and select `prisma/init.sql` from the uploaded app folder
5. Click **Go** — this creates all tables

> You only need to do this once. The app does not run database migrations automatically.

---

## 4. Upload files to the server

In cPanel → **File Manager**, create a folder for the app.
A good location is outside of `public_html`, for example:

```
/home/yourusername/[your-app]/
```

Upload the entire project **except** the following:

| Skip | Reason |
|------|--------|
| `node_modules/` | Large — **see note below** |
| `.env.local` | Never upload secrets — set them in the cPanel UI |
| `.git/` | Not needed on the server |

**Exception — upload these two folders from `node_modules/`:**

| Upload | Reason |
|--------|--------|
| `node_modules/@prisma/client/` | Pre-built Prisma client |
| `node_modules/.prisma/client/` | Linux engine binaries |

Uploading these means the server never needs to run `prisma generate`, which would
fail on shared hosting due to memory limits.

Everything else should be uploaded, including the `.next/` build folder and `prisma/init.sql`.

---

## 5. Create the Node.js app in cPanel

1. Log in to cPanel
2. Go to **Software → Setup Node.js App**
3. Click **Create Application**
4. Fill in the form:

| Field | Value |
|-------|-------|
| Node.js version | **20.x** (20.19.0 or higher recommended) |
| Application mode | Production |
| Application root | `/home/yourusername/[your-app]` |
| Application URL | Your domain or subdomain |
| Application startup file | `app.js` |

5. Click **Create**
6. Instead of clicking "Run NPM Install", open **cPanel Terminal** and run:
   ```bash
   cd ~/[your-app] && npm install --omit=dev --ignore-scripts
   ```
   - `--omit=dev` skips dev-only packages (ESLint, TypeScript, etc.) not needed at runtime
   - `--ignore-scripts` prevents `prisma generate` from running on the server (it's pre-built and uploaded)

---

## 6. Set environment variables

In the same **Setup Node.js App** screen, scroll to **Environment Variables** and add:

### Required

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `mysql://dbuser:dbpassword@localhost:3306/myusername_trakovo` |
| `ADMIN_JWT_SECRET` | A long random string (32+ characters) — run `openssl rand -hex 32` |
| `ADMIN_USERNAME` | Your admin login username |
| `ADMIN_PASSWORD` | Your admin login password |
| `VENDOR_JWT_SECRET` | Another long random string (different from admin secret) |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com` |
| `UPLOAD_DIR` | `/home/yourusername/[your-app]-uploads` (see note below) |

### Branding (optional — can also be set via Admin → Settings)

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SITE_NAME` | Public site name shown to customers (default: `Trakovo`) |
| `NEXT_PUBLIC_ADMIN_NAME` | Admin/vendor portal label (default: `Hire Manager`) |

> **Note:** Once the app is running you can override these under **Admin → Settings → Site Branding** without redeploying.

### Email — SMTP (optional, used if Microsoft 365 is not connected)

| Key | Value |
|-----|-------|
| `SMTP_HOST` | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | Your sending email address |
| `SMTP_PASS` | Your email app password |
| `SMTP_FROM` | e.g. `Bookings <bookings@yourdomain.com>` |

### Email — Microsoft 365 / Outlook (optional, takes priority over SMTP)

| Key | Value |
|-----|-------|
| `MS_CLIENT_ID` | Azure app client ID |
| `MS_CLIENT_SECRET` | Azure app client secret |
| `MS_TENANT_ID` | Azure tenant ID (or `common` for personal accounts) |

> Connect Microsoft 365 via **Admin → Settings → Connections** after deployment.

### Web Push Notifications (optional)

| Key | Value |
|-----|-------|
| `VAPID_PUBLIC_KEY` | VAPID public key — generate with `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | VAPID private key |
| `VAPID_SUBJECT` | `mailto:admin@yourdomain.com` |

> Push notifications can also be configured via **Admin → Settings → Connections**.

### Maintenance / Development Mode (optional)

| Key | Value |
|-----|-------|
| `MAINTENANCE_MODE` | `true` to show maintenance page to public (default: `false`) |
| `DEVELOPMENT_MODE` | `true` to show "coming soon" page (default: `false`) |
| `MAINTENANCE_PASSWORD` | Bypass password for admin access during maintenance |

> **Generating secrets:** Run `openssl rand -hex 32` in a terminal to generate strong random strings for JWT secrets.

---

## 7. Create the uploads folder

The uploads folder stores customer ID documents and other uploaded files.
It should live **outside** your app folder so it is not overwritten when you redeploy.

In cPanel → File Manager, create:
```
/home/yourusername/[your-app]-uploads/
```

Then set the `UPLOAD_DIR` environment variable to that full path.

---

## 8. Start the application

Back in **Setup Node.js App**, click **Restart** (or the play button) to start the app.

Visit your domain — you should see the home page.

---

## 9. Access the admin panel

Go to `https://your-domain.com/admin`

Log in with the `ADMIN_USERNAME` and `ADMIN_PASSWORD` you set in step 6.

---

## Important: Data that must persist between deployments

### MySQL database
All data lives in the MySQL database on your hosting server.
It is not affected by redeployments — only the app files change.

Back up the database regularly via **phpMyAdmin → Export** (SQL format),
or set up an automated backup in cPanel → **Backup**.

### Uploads folder
As long as `UPLOAD_DIR` points to a folder outside the app directory,
uploaded files will survive redeployments.

---

## Updating the site

When you make changes locally:

1. Run `npm install && npm run build` locally
2. Upload the updated files — at minimum the `.next/` folder and any changed source files
3. If you updated packages (`package.json` changed), also re-upload `node_modules/@prisma/client/` and `node_modules/.prisma/client/`, then re-run `npm install --omit=dev --ignore-scripts` in cPanel Terminal
4. In cPanel → Setup Node.js App → click **Restart**

The database and uploads folder are unaffected by updates.

If the Prisma schema changed (new columns or tables), generate a new SQL diff locally and apply it via phpMyAdmin before restarting.

---

## SSL / HTTPS

Enable SSL on your domain before going live.
In cPanel → **SSL/TLS** → use **AutoSSL** for a free certificate,
or install your own under **Manage SSL Sites**.

---

## Troubleshooting

**Blank page or 500 error**
- Check that the `.next/` folder was uploaded correctly after building
- Check all environment variables are set with no typos
- In cPanel Terminal: `cd ~/[your-app] && node app.js` to see error output

**"Cannot find module 'next'"**
- `node_modules` is missing — in cPanel Terminal: `npm install --omit=dev --ignore-scripts`
- Do not use the "Run NPM Install" button — it runs without `--ignore-scripts` and will fail

**Database connection error**
- Verify `DATABASE_URL` matches exactly: `mysql://user:pass@localhost:3306/dbname`
- Confirm the database user has been granted All Privileges on the database
- Test the connection in phpMyAdmin with the same credentials

**Tables don't exist / app crashes on first load**
- Ensure `prisma/init.sql` was imported via phpMyAdmin before starting the app

**Admin login not working**
- Verify `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set correctly
- Ensure `ADMIN_JWT_SECRET` is set — sessions will not work without it

**Emails not sending**
- Check `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` are all set
- For Gmail, use an App Password (not your regular password)
- Test email sending from Admin → Settings → Email

**File uploads failing**
- Ensure `UPLOAD_DIR` is set to a valid absolute path that exists on the server
- Check the folder has write permissions (755 or 777)

**App works but push notifications don't work**
- VAPID keys are generated and stored via Admin → Settings
- Ensure `NEXT_PUBLIC_SITE_URL` is set to your exact public domain with `https://`

---

## Notes

- cPanel/Passenger handles restarts automatically if the app crashes
- The `ecosystem.config.js` file is for VPS/PM2 deployments — ignore it for cPanel
- The `nginx.conf.example` file is for VPS deployments — ignore it for cPanel
