# Cold-Calling Performance & Real-Time Lead Platform

An independent, self-hosted SaaS web application for cold-calling teams built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **PostgreSQL**, **Prisma ORM**, **Server-Sent Events (SSE) + PostgreSQL LISTEN/NOTIFY**, and **Telegram Bot API**.

## Key Capabilities

- **Role-Based Access Control (RBAC)**: Strict server-side `ADMIN` and `CALLER` authorization with scrypt password hashing and HTTP-only database-backed session cookies.
- **One-Click Lead Announcements**: Two-step campaign selection + confirmation flow registering exactly 1 lead per submission with idempotency protection against double-clicks and concurrent requests.
- **Real-Time Synchronization**: PostgreSQL transactional `ActivityEvent` + `LISTEN/NOTIFY` streamed via SSE (`/api/realtime/stream`) with automatic reconnect, sequence catch-up, and midnight EST rollover detection.
- **Leaderboards & Tie-Breaking**: Independent **Daily** (fixed `UTC-5` EST midnight reset), **Monthly**, and **All-Time** leaderboards with gold, silver, and bronze crowns and deterministic first-achievement-timestamp tie-breaking.
- **Caller Profile Customization**: Independent announcement display name and validated custom Telegram message templates (`{name}`, `{campaign}`) with live preview.
- **Reliable Telegram Delivery**: Background notification queue with atomic job claiming, exponential-backoff retries, duplicate prevention, encrypted bot token storage, and admin delivery status monitoring.
- **Historical Analytics & Exports**: Daily, monthly, individual caller, and campaign histories with formula-injection-safe CSV and Excel (`.xlsx`) exports.

## Quick Start (Local Development)

1. Copy `.env.example` to `.env` and configure `DATABASE_URL` and `AUTH_SECRET`.
2. Install dependencies and generate Prisma client:
   ```bash
   npm install
   npx prisma generate
   ```
3. Apply migrations and seed the initial admin account:
   ```bash
   npx prisma migrate deploy
   npx tsx prisma/seed.ts
   ```
4. Start development or production server:
   ```bash
   npm run dev
   ```

For Docker Compose VPS deployment, Nginx SSE configuration, Telegram Bot setup, and backup/recovery instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).
