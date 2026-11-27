# Ring&Rise — Cold-Calling Performance & Real-Time Lead Platform

A full-stack, real-time sales performance and leaderboard application built with **Next.js 15 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS**, **PostgreSQL**, **Prisma ORM**, and **Telegram Bot API**.

---

## Key Features

- **Real-Time Leaderboards & FLIP Rank Transitions**
  - Independent **Daily** (fixed `UTC-5` EST midnight reset), **Monthly**, and **All-Time** leaderboards with top-3 crown badges.
  - Deterministic tie-breaking (earliest timestamp reaching the lead count ranks first), live tiebreaker footer, and inline timestamp pills shown when callers are tied.
  - Smooth `useLayoutEffect` FLIP row animations and theme-styled floating `+N` rank-climb pop-ups whenever rankings shift.
- **Fast Lead Announcements**
  - Viewport-fixed floating **ANNOUNCE LEAD** action for callers.
  - Searchable **2-column** campaign selector modal with live daily target progress and a 2-step Telegram preview & confirmation flow backed by idempotency keys (`POST /api/leads`).
- **One-Tap Telegram Progress Summaries & Delivery Queue**
  - Send live **Campaigns Progress** or **Callers Progress** summaries directly to your team Telegram group.
  - Database-backed `TelegramNotificationJob` queue with exponential-backoff retries, AES-encrypted bot token storage, and manual retry controls in Admin Settings.
- **Custom Appearance Themes & Backdrops**
  - Instant per-browser theme switching with zero-flash pre-paint initialization and preloaded WebP backdrops:
    - **Classic Light** (`classic`) — Crisp light workspace
    - **Midnight Dark** (`dark`) — Sleek obsidian dark mode
    - **Vinyl Studio** (`music`) — Neon magenta/violet palette with turntable stage backdrop
    - **Cyber Arcade** (`gaming`) — Mint/cyan HUD palette with GTA 6 backdrop
    - **Sakura Blush** (`blush`) — Rose-petal palette with repeating cherry blossom SVG pattern
    - **Tom & Jerry** (`meme`) — Comic pop palette with 9-tile Tom & Jerry meme backdrop
    - **Breaking Bad** (`breaking-bad`) — Chemistry green & hazmat gold palette with desert RV backdrop
- **Admin Portal with Client SWR Caching**
  - Real-time overview metrics, caller & account management, campaign management, historical analytics (Daily, Monthly, Caller, Campaign), and formula-safe **CSV** & **Excel (`.xlsx`)** exports.
  - Keep-alive admin sections hydrated via an event-sequence-aware in-memory SWR cache (`src/lib/admin-cache.ts`).
- **Role-Based Auth & Navigation UX**
  - `ADMIN` and `CALLER` roles with scrypt password hashing, HTTP-only database-backed session cookies, route-transition logo loader (`PageLoader`), and caller profile customization (`{name}`, `{campaign}` templates).

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling & UI | Tailwind CSS, Radix UI primitives, Lucide Icons, Sonner toasts |
| Database & ORM | PostgreSQL (`pg`), Prisma ORM |
| Real-Time Sync | PostgreSQL `LISTEN/NOTIFY` + SSE (self-hosted) & conditional polling (`VERCEL=1`) |
| Exports & Testing | ExcelJS (`.xlsx`), Vitest |

---

## Real-Time & Deployment Architecture

The app adapts automatically based on its runtime environment:

- **Vercel / Serverless (`VERCEL=1` or `REALTIME_MODE=poll`):**
  - Automatically skips long-lived `pg` `LISTEN/NOTIFY` background workers (`src/instrumentation.ts`) and switches dashboard sync to conditional polling (`/api/dashboard/state?sinceSeq=...`) with sequence-keyed shared caching so multiple instances stay consistent.
  - `POST /api/leads` schedules Telegram dispatch via Next.js `after()` so lead submission stays fast.
- **Self-Hosted / Docker (`REALTIME_MODE=sse`, default outside Vercel):**
  - Uses PostgreSQL transactional `ActivityEvent` + `LISTEN/NOTIFY` streamed over Server-Sent Events (`/api/realtime/stream`) plus an in-process Telegram retry worker.

---

## Quick Start (Local Development)

### 1. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Key variables in `.env`:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (`POSTGRES_PRISMA_URL` and `POSTGRES_URL` also supported) |
| `AUTH_SECRET` | Strong 32+ character random secret for session signing and token encryption |
| `FORCE_SECURE_COOKIES` | `"false"` for plain HTTP localhost; `"true"` for HTTPS in production (Vercel / Nginx) |
| `INITIAL_ADMIN_NAME` | Seeded initial admin display name |
| `INITIAL_ADMIN_USERNAME` | Seeded initial admin login username |
| `INITIAL_ADMIN_PASSWORD` | Seeded initial admin password (rotate after first login) |
| `TELEGRAM_BOT_TOKEN` | Optional env fallback (can be managed in Admin -> Telegram & Settings) |
| `TELEGRAM_CHAT_ID` | Optional env fallback (can be managed in Admin -> Telegram & Settings) |
| `BRAND_NAME` / `BRAND_TAGLINE` / `BRAND_PRIMARY_COLOR` | Default branding fallback settings |
| `PORT` | Server port (defaults to `3000`) |

### 2. Install, Migrate, Seed & Run

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run dev
```

Visit `http://localhost:3000`.

---

## Deploying to Vercel or Docker

- **Vercel:** Connect the GitHub repository, set `DATABASE_URL` (use a pooled connection string such as Neon/Supabase pooler), `AUTH_SECRET`, and `FORCE_SECURE_COOKIES="true"`, and run `prisma generate && next build` (already configured as `npm run build`).
- **Docker Compose / VPS & Operations:** See [DEPLOYMENT.md](./DEPLOYMENT.md) for Docker Compose setup, Nginx SSE configuration, Telegram Bot setup, PostgreSQL backup/restore commands, and EST timezone policy.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js development server |
| `npm run build` | Run `prisma generate && next build` |
| `npm run start` | Start Next.js production server |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm run test` | Run Vitest suite (`vitest run`) |
| `npm run db:migrate` | Create/apply development Prisma migrations |
| `npm run db:migrate:deploy` | Apply production Prisma migrations |
| `npm run db:seed` | Seed initial admin account and default system settings |

---

## Project Structure

```text
src/
  app/                # App Router pages (/, /admin, /profile, /login), loading states & API routes
  components/
    admin/            # Admin portal sections (Overview, Callers, Campaigns, Analytics, Settings)
    auth/             # Login flow
    dashboard/        # Caller dashboard, FLIP leaderboard, campaign progress & lead modal
    profile/          # Caller profile & personal lead history
    ui/               # Reusable UI primitives
  hooks/              # Real-time dashboard sync hook (SSE + conditional polling)
  lib/                # Auth, crypto, DB, leaderboard, analytics, admin SWR cache, Telegram & themes
prisma/               # Prisma schema, migrations & seed script
public/               # Logo and WebP theme backgrounds & Tom & Jerry meme assets
tests/                # Vitest unit and integration tests
```
