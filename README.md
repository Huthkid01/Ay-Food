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
├── frontend/       # React 19 + Vite app
├── backend/        # Fastify API + Prisma
├── docker-compose.yml
└── nginx/          # Production reverse proxy
```

## Docker (Production)

```bash
docker compose up --build
```

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database → Connection string**
3. Copy both connection strings into `backend/.env`:

```env
# Transaction pooler (port 6543) — used by the app at runtime
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection (port 5432) — used for migrations
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

4. Run migrations and seed data:

```bash
cd backend
npm run db:setup    # applies migrations + seeds menu
```

For schema changes later:

```bash
npm run db:migrate  # create & apply new migration (dev)
npm run db:migrate:deploy  # apply migrations in production
```

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
