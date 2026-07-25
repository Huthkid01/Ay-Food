# Ay Food — Restaurant Ordering Platform

Production-ready meal customization and online ordering platform for **Ay Food** in Ogijo, Ikorodu — build your own Nigerian meal packs and order online.

## Quick Start

```bash
# Install root dependencies
npm install

# Setup database & seed 50+ Nigerian meals
cd backend && npm install && cp .env.example .env
# Edit .env with your Supabase credentials, then:
npm run db:setup

# Start both frontend & backend
cd .. && npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **Health check:** http://localhost:3001/health

### Demo Accounts

| Role     | Email               | Password    |
|----------|---------------------|-------------|
| Admin    | admin@ayfood.ng     | password123 |
| Customer | customer@example.com | password123 |

### Demo Coupons

- `WELCOME10` — 10% off (min ₦3,000)
- `FLAT500` — ₦500 off (min ₦5,000)

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod, Framer Motion, Lucide Icons

**Backend:** Node.js, Fastify, TypeScript, Prisma ORM, JWT, bcrypt

**Database:** PostgreSQL (Supabase recommended)

**Payments:** Stripe, Flutterwave, Paystack (swappable adapters)

## Features

- Beautiful homepage with hero, featured meals, FAQ
- Browse menu with search & category filters
- **Build Your Own Pack** — step-by-step meal builder with portions & real-time pricing
- Cart with quantity controls, notes, save-for-later
- Checkout with delivery/pickup, coupons, multi-gateway payment
- Live order tracking (6 status stages)
- Customer auth & admin dashboard with analytics
- 55+ seeded Nigerian menu items
- Inventory low-stock alerts
- Multi-restaurant ready architecture

## Project Structure

```
Ay Food/
├── frontend/                 # React + Vite (host on Vercel)
│   ├── .env.example          # ← copy to .env.local (anon key + URL)
│   └── .env.local            # ← YOU create this (gitignored)
├── supabase/                 # ← Database + Edge Functions (host on Supabase)
│   ├── migrations/           # SQL migrations (db push)
│   ├── functions/            # Edge Functions (create-order, payments, track)
│   └── config.toml
├── backend/                  # Legacy Fastify/Prisma (optional; migrating off)
└── README.md
```

## Env file for Supabase anon key + URL

**File to create:** [`frontend/.env.local`](frontend/.env.local)

```bash
cd frontend
cp .env.example .env.local
```

Then paste from Supabase → **Project Settings → API**:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key
```

Also add the same two variables in **Vercel → Project → Settings → Environment Variables**.

Do **not** put the service role key in the frontend. That goes in Edge Function secrets.

## Supabase CLI (login + migrations + Edge Functions)

```bash
# 1) Login in your terminal (opens browser)
npx supabase login

# 2) Link this repo to your project (enter project ref when asked)
npx supabase link --project-ref YOUR_PROJECT_REF

# 3) Push SQL migrations (creates tables, RLS, realtime)
npx supabase db push

# 4) Deploy Edge Functions
npx supabase functions deploy create-order
npx supabase functions deploy payment-init
npx supabase functions deploy payment-verify
npx supabase functions deploy track-order

# 5) Set secrets (service role + payment keys)
npx supabase secrets set APP_URL=https://your-vercel-app.vercel.app
# SUPABASE_SERVICE_ROLE_KEY is usually injected automatically for functions
```

Or use npm shortcuts from the repo root: `npm run supabase:login` · `supabase:link` · `supabase:push` · `supabase:functions`.

### Realtime
Migration enables Realtime on `orders`, `order_items`, `foods`, `categories`, `payments`. Admin dashboard uses `useAdminRealtime` (same pattern as Nexlogs) so kitchen updates live without refresh.

## Legacy Prisma connection (optional)

If you still run the Fastify API locally:

1. Create a project at [supabase.com](https://supabase.com)
2. Put pooler URLs in `backend/.env` (`DATABASE_URL` + `DIRECT_URL`) — no leftover `[REGION]` brackets
3. `cd backend && npm run db:setup`

Preferred path going forward: **Vercel frontend + Supabase migrations/functions** (no Fastify host required).

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET`
- `STRIPE_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY`, `PAYSTACK_SECRET_KEY`
- `CLOUDINARY_URL`, `RESEND_API_KEY`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/menu/foods | List foods with filters |
| GET | /api/menu/categories | List categories |
| POST | /api/orders | Create order |
| GET | /api/orders/:orderNumber/track | Track order |
| POST | /api/payments/initialize | Init payment |
| POST | /api/auth/login | Login |
| GET | /api/admin/dashboard | Admin analytics |
