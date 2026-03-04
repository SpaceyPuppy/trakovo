# cPanel Deployment Guide

This app runs on Node.js via **Phusion Passenger**, which cPanel uses to manage
Node.js applications. Passenger handles process management and restarts automatically.

---

## Prerequisites

- cPanel hosting with **Node.js support** (Setup Node.js App must be available)
- Node.js 18.x or 20.x available on the server
- Node.js 18+ installed on your **local machine** for building

---

## 1. Build the app locally

Run this in the project folder on your local machine:

```bash
npm install
npm run build
```

This creates the `.next/` folder containing the compiled application.
You must do this before every deployment.

---

## 2. Upload files to the server

In cPanel → **File Manager**, create a folder for the app.
A good location is outside of `public_html`, for example:

```
/home/yourusername/[your-app]/
```

Upload the entire project **except** the following:

| Skip | Reason |
|------|--------|
| `node_modules/` | Large — run `npm install` on the server instead |
| `.env.local` | Never upload secrets — set them in the cPanel UI |
| `.git/` | Not needed on the server |

Everything else should be uploaded, including the `.next/` build folder.

---

## 3. Create the Node.js app in cPanel

1. Log in to cPanel
2. Go to **Software → Setup Node.js App**
3. Click **Create Application**
4. Fill in the form:

| Field | Value |
|-------|-------|
| Node.js version | 18.x or 20.x (choose highest available) |
| Application mode | Production |
| Application root | `/home/yourusername/[your-app]` |
| Application URL | Your domain or subdomain |
| Application startup file | `app.js` |

5. Click **Create**
6. Click **Run NPM Install** to install dependencies on the server

---

## 4. Set environment variables

In the same **Setup Node.js App** screen, scroll to **Environment Variables** and add:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `file:./prisma/bookings.db` |
| `ADMIN_JWT_SECRET` | A long random string (32+ characters) |
| `ADMIN_USERNAME` | Your admin login username |
| `ADMIN_PASSWORD` | Your admin login password |
| `VENDOR_JWT_SECRET` | Another long random string (different from admin secret) |
| `SMTP_HOST` | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | Your sending email address |
| `SMTP_PASS` | Your email app password |
| `SMTP_FROM` | e.g. `Bookings <bookings@yourdomain.com>` |
| `NEXT_PUBLIC_SITE_NAME` | Your site/business name |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com` |
| `UPLOAD_DIR` | `/home/yourusername/[your-app]-uploads` (see note below) |

> **Generating secrets:** Use a password manager or run `openssl rand -hex 32`
> in a terminal to generate strong random strings for JWT secrets.

---

## 5. Create the uploads folder

The uploads folder stores customer ID documents and other uploaded files.
It should live **outside** your app folder so it is not overwritten when you redeploy.

In cPanel → File Manager, create:
```
/home/yourusername/[your-app]-uploads/
```

Then set the `UPLOAD_DIR` environment variable to that full path.

---

## 6. Start the application

Back in **Setup Node.js App**, click **Restart** (or the play button) to start the app.

Visit your domain — you should see the home page.

---

## 7. Access the admin panel

Go to `https://your-domain.com/admin`

Log in with the `ADMIN_USERNAME` and `ADMIN_PASSWORD` you set in step 4.

---

## Important: Data that must persist between deployments

### SQLite database
The database is a single file stored at the path set in `DATABASE_URL`.
**Do not delete this file when redeploying** — it contains all bookings, vehicles, and settings.

On first run the file is created automatically. Back it up regularly via File Manager.

### Uploads folder
As long as `UPLOAD_DIR` points to a folder outside the app directory,
uploaded files will survive redeployments.

---

## Updating the site

When you make changes locally:

1. Run `npm run build` locally
2. Upload the updated files — at minimum the `.next/` folder and any changed source files
3. In cPanel → Setup Node.js App → click **Restart**

The database and uploads folder are unaffected by updates.

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
- `node_modules` is missing — click **Run NPM Install** in Setup Node.js App,
  or in cPanel Terminal: `npm install`

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
