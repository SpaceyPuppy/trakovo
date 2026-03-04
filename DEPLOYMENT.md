# Trakovo — Deployment Guide

## Prerequisites
- Ubuntu 22.04+ VPS
- Node.js 18+ (`curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs`)
- PM2 (`sudo npm install -g pm2`)
- Nginx (`sudo apt install -y nginx`)

---

## 1. Upload & Install

```bash
# On your VPS
sudo mkdir -p /var/www/trakovo
sudo chown $USER:$USER /var/www/trakovo

# Upload project files (from your local machine)
scp -r ./trakovo/* user@your-server:/var/www/trakovo/

# Install dependencies
cd /var/www/trakovo
npm install
```

---

## 2. Configure Environment

```bash
cp .env.example .env
nano .env
```

Fill in all values:
- `NEXT_PUBLIC_FLEETBASE_URL` — your Fleetbase instance URL (e.g. `https://app.fleetbase.io` or your self-hosted URL)
- `NEXT_PUBLIC_STOREFRONT_KEY` — Storefront public API key (Fleetbase → Storefront → Settings → API Keys)
- `FLEETBASE_OPERATOR_KEY` — Operator secret key (Fleetbase → Settings → API Keys)
- `ADMIN_JWT_SECRET` — Run `openssl rand -hex 32` to generate
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — Your admin login credentials

---

## 3. Build

```bash
npm run build
```

---

## 4. Start with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # follow the printed command to auto-start on reboot
```

---

## 5. Configure Nginx

```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/trakovo
sudo nano /etc/nginx/sites-available/trakovo
# Replace 'your-domain.com' with your actual domain

sudo ln -s /etc/nginx/sites-available/trakovo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. SSL Certificate (recommended)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Then uncomment the HTTPS block in `/etc/nginx/sites-available/trakovo` and reload nginx.

---

## Updating

```bash
cd /var/www/trakovo
# Upload new files / git pull
npm install
npm run build
pm2 restart trakovo
```

---

## Admin Panel

Access at: `https://your-domain.com/admin`

Login with the `ADMIN_USERNAME` and `ADMIN_PASSWORD` you set in `.env`.

From the admin panel you can:
- **Add/edit/delete vehicles** — syncs directly to Fleetbase Storefront products
- **View bookings** — all fields including driver details and document links
- **Update booking status** — Pending → Confirmed → Completed / Cancelled

---

## Fleetbase Setup Checklist

Before going live, in your Fleetbase console:

1. **Create a Storefront** if you haven't already
2. **Generate API keys**: Settings → API Keys — copy the public key to `NEXT_PUBLIC_STOREFRONT_KEY` and the operator key to `FLEETBASE_OPERATOR_KEY`
3. **Install the vehicle-hire extension** (`vehicle-hire-extension.zip`) — see its own DEPLOYMENT.md
4. **Configure notification email**: Storefront → Settings → Notifications — add your staff email so you're alerted on new orders
5. **Add vehicles** via the admin panel at `/admin/vehicles` — each vehicle you create here becomes a Storefront product in Fleetbase

---

## File Upload Note

Dry hire document uploads (ID scans, licence photos) are sent to your Fleetbase extension backend and stored on the private disk. Make sure your Fleetbase server has sufficient disk space and is included in backups.
