# Ad Campaign Manager & Real-Time Ad Delivery Engine

A full-stack advertising platform for campaign management, real-time ad delivery, impression/click tracking, budget protection, and frequency capping.

## 1. Tech Stack

- Frontend: React 19, TypeScript, Vite, Native Fetch API, CSS, Nginx
- Backend: Node.js 22, TypeScript, Express 5, Zod, Prisma 7, `@prisma/adapter-pg`, `pg`
- Database: PostgreSQL 16
- Runtime: Docker, Docker Compose
- CI: GitHub Actions

## 2. Main Features

### Campaign Management

Operators can create, edit, activate, and pause campaigns; configure creative URLs; set total/daily budgets; choose CPI or CPC bidding; and target multiple countries, devices, and categories.

An empty targeting list means unrestricted targeting for that field.

The dashboard shows status, targeting, bid, budgets, spend, impressions, clicks, and CTR. Metrics refresh automatically every 5 seconds.

### Real-Time Ad Serving

`POST /ads/serve` accepts `userId`, `country`, `device`, and optional `category`.

The engine excludes campaigns that are inactive, outside the visitor's targeting rules, unable to cover the next bid within total/daily budget, or frequency-capped for the user.

Eligible campaigns are ordered by highest bid. Campaign ID is the deterministic tie-breaker for equal bids.

### CPI / CPC Billing

- CPI: charge on impression.
- CPC: charge on click.

Money is stored internally as integer micro-units (`BigInt`) to avoid floating-point rounding errors.

### Frequency Capping

Default:

```text
3 impressions per user per campaign
within a rolling 1-hour window
```

Configuration: `backend/src/config/ad.config.ts`.

### Secure Tracking and Idempotency

`/ads/serve` returns an HMAC-signed tracking token containing campaign, user, bid terms, a unique opportunity ID (`jti`), and expiry.

Tracking endpoints accept the signed token instead of client-supplied campaign/user IDs. Impression and click event IDs are derived from the opportunity ID, so retries do not double-count. A click is accepted only when the exact matching impression opportunity already exists.

### Concurrency and Query Efficiency

Tracking uses PostgreSQL row-level locking on the affected campaign, preventing concurrent budget/frequency over-delivery while allowing unrelated campaigns to proceed independently.

Ad selection avoids per-candidate N+1 queries by batching daily-spend and frequency aggregates. GIN targeting indexes and compound event indexes support the main query paths.

### Ad Inspector

The Ad Inspector can simulate visitor context, request the winning ad, render the creative, record impression/click events, show updated metrics, and demonstrate targeting, budget, frequency-cap, and no-match behaviour.

## 3. Architecture

```text
Browser
   |
   | http://localhost:5173
   v
Frontend Container (Nginx :80)
   |
   | /api/*
   v
Backend Container (Express :8000)
   |
   | Prisma Client + PostgreSQL adapter
   v
Database Container (PostgreSQL :5432)
```

Docker Compose startup:

```text
db (healthy)
   ↓
migrate (one-shot)
   ↓
backend (healthy)
   ↓
frontend
```

The production backend runs compiled JavaScript as the non-root `node` user and installs production dependencies only. Prisma CLI, TypeScript, `tsx`, Vitest, and source-only tooling are kept out of the long-running backend runtime.

## 4. Project Structure

```text
ad-campaign-manager/
├── .github/workflows/ci.yml
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   ├── tests/
│   ├── Dockerfile
│   ├── prisma7.config.ts
│   ├── tsconfig.json
│   └── tsconfig.build.json
├── frontend/
│   ├── public/
│   ├── src/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── vite.config.ts
├── docker-compose.yml
├── .env.example
└── README.md
```

Generated Prisma Client code and build output are not committed.

## 5. Quick Start with Docker Compose

### Prerequisites

- Docker Desktop, or Docker Engine with Docker Compose
- Git

Node.js and npm are not required on the host for the Docker workflow.

### Step 1: Clone

```bash
git clone https://github.com/jincui1127/ad-campaign-manager.git
cd ad-campaign-manager
```

### Step 2: Create `.env`

```bash
cp .env.example .env
```

Generate a secret:

```bash
openssl rand -hex 32
```

Copy it into `.env` as `AD_TOKEN_SECRET`.

### Step 3: Build and Start

```bash
docker compose up --build -d
docker compose ps -a
```

Expected state:

```text
db        healthy
migrate   exited (0)
backend   healthy
frontend  running
```

`migrate` is a one-shot service, so `exited (0)` is expected.

### Step 4: Load / Reset Demo Data

```bash
docker compose run --rm migrate npx prisma db seed
```

This starts a temporary tooling container from the existing `migrate` service configuration, seeds the same PostgreSQL database, and removes the temporary container afterward.

The seed script deletes existing `AdEvent` and `Campaign` rows before recreating demo campaigns.

### Step 5: Open

Frontend: `http://localhost:5173`  
Backend: `http://localhost:8000`  
Health check: `http://localhost:8000/healthz`

PostgreSQL is published at `localhost:5432`.

## 6. Demo Workflow

Example visitor:

```text
User ID: demo_user
Country: AU
Device: mobile
Category: sports
```

1. Create/edit or pause/activate campaigns in the Dashboard.
2. Click **Request Ad** in the Ad Inspector.
3. Click **Simulate Impression**.
4. Click **Simulate Click**.
5. Observe updated metrics.
6. Repeat impressions for the same user/campaign to demonstrate frequency capping.
7. Change targeting inputs to demonstrate another winner or a no-ad result.

For CPI campaigns, the impression carries the charge. For CPC campaigns, the click carries the charge.

## 7. API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/campaigns` | List campaigns |
| GET | `/campaigns/:id` | Get one campaign |
| POST | `/campaigns` | Create a campaign |
| PATCH | `/campaigns/:id` | Update, pause, or activate a campaign |
| POST | `/ads/serve` | Select the highest-bidding eligible ad |
| POST | `/events/impression` | Record an impression from a signed token |
| POST | `/events/click` | Record a click from a signed token |
| GET | `/healthz` | Database-backed health check |

When accessed through Nginx, frontend requests use `/api/*`; backend routes themselves do not include `/api`.

## 8. Database and Delivery Rules

`Campaign` stores creative data, CPI/CPC bid settings, targeting arrays, budgets, status, spend, impressions, and clicks.

`AdEvent` stores unique event ID, campaign/user IDs, event type, event cost, and timestamp.

Daily spend uses the UTC calendar day. Prisma migrations track schema evolution.

## 9. Testing and CI

Backend integration tests use a real PostgreSQL test database and cover targeting/no-match behaviour, frequency capping, idempotency, HMAC token validation, exact click attribution, CPI/CPC billing, budget protection, concurrency, and highest-bid selection.

Local backend checks:

```bash
cd backend
npm run typecheck
npm test
npm run build
```

Frontend checks:

```bash
cd frontend
npm run lint
npm run build
```

GitHub Actions runs backend type checking/tests and frontend lint/build on pushes and pull requests to `main`.

## 10. Optional Local Development

The Docker workflow above is the recommended reproduction path.

Start PostgreSQL:

```bash
docker compose up -d db
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql://aduser:adpassword@localhost:5432/admanager
AD_TOKEN_SECRET=<your-secret-at-least-32-characters>
```

Backend:

```bash
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

Vite proxies `/api/*` to `http://localhost:8000`.

## 11. Useful Docker Commands

```bash
docker compose up -d
docker compose up --build -d
docker compose run --rm migrate npx prisma db seed
docker compose down
```

To also remove the PostgreSQL volume:

```bash
docker compose down -v
```

Use `-v` only for a complete database reset.

## 12. Prototype Scope

This take-home focuses on:

- campaign lifecycle management;
- multi-value targeting;
- real-time eligibility filtering and highest-bid selection;
- CPI/CPC billing;
- impression and click tracking;
- idempotency and signed tracking tokens;
- frequency capping;
- total and daily budget protection;
- concurrency-safe event processing;
- persistent PostgreSQL storage;
- automated backend integration tests and CI;
- Docker Compose based end-to-end execution.