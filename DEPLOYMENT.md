# Deployment, Operations & Handover Guide

This platform is an independent, self-hosted Next.js + PostgreSQL application designed for full company ownership with zero external CRM or personal account dependencies.

---

## 1. Prerequisites

- Docker Engine 24+ and Docker Compose v2+ (recommended for VPS deployment)
- OR Node.js 22+ and PostgreSQL 16+ for bare-metal deployment

---

## 2. Environment Configuration

Copy `.env.example` to `.env` and fill in production secrets:

```bash
cp .env.example .env
```

Generate a strong `AUTH_SECRET` (at least 32 random bytes):

```bash
openssl rand -base64 48
```

Required variables in `.env`:

| Variable | Description |
| --- | --- |
| `POSTGRES_PASSWORD` | Strong password for the PostgreSQL database container |
| `AUTH_SECRET` | Random secret used for session HMAC signing and encrypting stored Telegram tokens |
| `FORCE_SECURE_COOKIES` | Set to `true` when serving over HTTPS behind a reverse proxy; `false` for plain HTTP localhost testing |
| `INITIAL_ADMIN_USERNAME` | Initial admin login username created on first boot |
| `INITIAL_ADMIN_PASSWORD` | Initial admin password — change or rotate immediately after first login |
| `TELEGRAM_BOT_TOKEN` | Optional env fallback; can also be configured securely in Admin -> Telegram & Settings |
| `TELEGRAM_CHAT_ID` | Optional env fallback; can also be configured in Admin -> Telegram & Settings |

---

## 3A. Deploying on Render.com (Single Full-Stack Service + PostgreSQL)

Because Next.js serves both the frontend UI and the backend API (`/api/*`, SSE streaming, PostgreSQL `LISTEN/NOTIFY`, and the Telegram worker) in one Node.js application, you deploy **one PostgreSQL database** and **one Web Service** on Render.

### Option 1: One-Click Blueprint (`render.yaml`)
1. Push your latest code to GitHub.
2. In Render Dashboard, click **New + -> Blueprint** and select this repository.
3. Render automatically reads [render.yaml](./render.yaml), provisions `ringrise-db` (PostgreSQL) and `ringrise-app` (Node Web Service), and prompts for `INITIAL_ADMIN_PASSWORD`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID`.

### Option 2: Manual Setup on Render
1. **Database**: Create **New + -> PostgreSQL** (copy its **Internal Database URL**).
2. **Web Service**: Create **New + -> Web Service** connected to your GitHub repo:
   - **Runtime**: `Node`
   - **Build Command**: `npm ci --include=dev && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npx tsx prisma/seed.ts && npm run start`
   - **Health Check Path**: `/api/health`
3. **Environment Variables** on the Web Service:
   - `DATABASE_URL`: paste the Internal Database URL from step 1
   - `AUTH_SECRET`: 32+ random characters
   - `FORCE_SECURE_COOKIES`: `true`
   - `INITIAL_ADMIN_USERNAME`: `admin`
   - `INITIAL_ADMIN_PASSWORD`: your chosen admin password
   - `SEED_SAMPLE_TEAM`: `false` (or `true` for starter sample data)

---

## 3B. Deploying with Docker Compose (VPS)

Build and start PostgreSQL and the web application:

```bash
docker compose up -d --build
```

The container entrypoint automatically runs:
1. `npx prisma migrate deploy` (creates/updates PostgreSQL tables)
2. `npx tsx prisma/seed.ts` (creates default system settings and initial admin account if none exists)
3. Starts the production Next.js server on port `3000` (configurable via `APP_PORT`)

Verify health:

```bash
curl http://localhost:3000/api/health
```

Expected response: `{"status":"ok","timestamp":"..."}`.

---

## 4. Reverse Proxy & HTTPS (Nginx Example)

Because real-time updates use Server-Sent Events (SSE) on `/api/realtime/stream`, disable proxy buffering so events arrive immediately:

```nginx
server {
    listen 443 ssl http2;
    server_name performance.yourcompany.com;

    # ssl_certificate ...;
    # ssl_certificate_key ...;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Critical for real-time SSE streaming
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
    }
}
```

Set `FORCE_SECURE_COOKIES="true"` in `.env` when running behind HTTPS.

---

## 5. Telegram Bot Setup

1. Open Telegram and message **@BotFather**.
2. Send `/newbot`, choose a display name and bot username (ending in `bot`).
3. Copy the **Bot Token** provided by BotFather.
4. Add the new bot to your team's Telegram group.
   - If the group has privacy mode restrictions or admin-only posting, grant the bot permission to send messages (or promote it to group admin).
5. Obtain the **Group Chat ID**:
   - Send a message in the group mentioning the bot, then visit:
     `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Look for `"chat":{"id":-100...}` (group IDs are negative numbers; supergroups start with `-100`).
6. Log in to the web app as an Admin -> **Administration -> Telegram & Settings**:
   - Paste the **Telegram Group Chat ID** and **Telegram Bot Token**.
   - Click **Save Configuration**, then click **Send Test Message** to verify delivery.

---

## 6. Database Backup & Restoration

### Automated Daily Backup (Cron Example)

Create a compressed PostgreSQL dump:

```bash
docker exec cold_calling_postgres pg_dump -U postgres -d cold_calling_platform -Fc > backup_$(date +%F).dump
```

### Restore from Backup

```bash
cat backup_2026-11-25.dump | docker exec -i cold_calling_postgres pg_restore -U postgres -d cold_calling_platform --clean --if-exists
```

---

## 7. Timezone & Daily Reset Policy

- All daily and monthly rollups use **fixed EST (`UTC-5`)**.
- Daily leaderboards and daily campaign targets reset automatically at **00:00:00 EST (`05:00:00 UTC`)** year-round without DST shifts.
- Historical lead records are never deleted during daily or monthly resets.

---

## 8. Troubleshooting

- **Login cookie not persisting**: If accessing over plain `http://` (without HTTPS), ensure `FORCE_SECURE_COOKIES="false"`. Over HTTPS, set `FORCE_SECURE_COOKIES="true"`.
- **Real-time badge stays "Reconnecting..."**: Verify your reverse proxy has `proxy_buffering off;` and `proxy_read_timeout 3600s;` for `/api/realtime/stream`.
- **Telegram messages show `RETRYING` or `FAILED`**: Check **Administration -> Telegram & Settings -> Telegram Delivery Status** for the exact Telegram API error message. Leads remain safely saved in PostgreSQL; once credentials or connectivity are restored, pending jobs retry automatically or can be retried immediately via the **Retry** button.
- **Database migrations on bare metal**:
  ```bash
  npx prisma migrate deploy
  npx tsx prisma/seed.ts
  ```
