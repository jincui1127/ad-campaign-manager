# Ad Campaign Manager & Real-Time Ad Delivery Engine

A full-stack prototype for managing digital advertising campaigns and serving ads in real time based on targeting rules, budgets, bidding, and frequency capping.

The application includes:

- an Advertiser / Operations Dashboard for campaign management;
- a real-time Ad Delivery Engine;
- impression and click tracking;
- budget and frequency-cap protection;
- an interactive Ad Inspector for testing and demonstration.

---

## 1. Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Native Fetch API
- CSS
- Nginx

### Backend
- Node.js
- TypeScript
- Express
- Zod
- Prisma
- PostgreSQL adapter

### Database and Runtime
- PostgreSQL 16
- Docker
- Docker Compose

---

## 2. Main Features

### Campaign Management

Operators can create, edit, activate, and pause campaigns, and configure:

- campaign name;
- headline;
- image URL;
- landing page URL;
- total budget;
- daily budget;
- bid price;
- country targeting;
- device targeting;
- category targeting.

The dashboard displays campaign status, targeting, bid price, total/daily budget, spend, impressions, and clicks.

### Real-Time Ad Serving

A client can request an ad using visitor context such as User ID, Country, Device, and Category.

The delivery engine filters out campaigns that are:

- inactive;
- outside the visitor's targeting criteria;
- over the total budget;
- over the daily budget;
- frequency capped for that user.

Among the remaining eligible campaigns, the highest bid wins.

### Frequency Capping

The default rule is:

```text
3 impressions per user per campaign
within a rolling 1-hour window
```

The configuration is stored in:

```text
backend/src/config/ad.config.ts
```

### Impression and Click Tracking

Impression tracking:

- creates an `AdEvent`;
- increments campaign impressions;
- increases campaign spend by the bid price;
- checks frequency and budget limits.

Click tracking:

- creates an `AdEvent`;
- increments campaign clicks;
- requires a previous impression for the same user and campaign;
- does not add spend because this prototype uses CPI billing.

### Idempotency and Concurrency

Each tracking request uses a unique `eventId` to prevent double counting.

Impression processing uses serializable database transactions with retry handling to protect against concurrent budget over-delivery, frequency-cap race conditions, and duplicate event insertion.

### Ad Inspector

The frontend includes an interactive Ad Inspector that can:

1. simulate a visitor request;
2. request the winning ad;
3. render the returned creative;
4. simulate an impression;
5. simulate a click;
6. display updated campaign metrics;
7. demonstrate frequency-cap behaviour;
8. demonstrate targeting and no-match behaviour.

---

## 3. Architecture

```text
Browser
   |
   | http://localhost:5173
   v
Frontend Container
Nginx :80
   |
   | /api/*
   v
Backend Container
Express :8000
   |
   | Prisma
   v
Database Container
PostgreSQL :5432
```

Docker Compose runs all three services on the same internal network.

Container-to-container communication uses Docker Compose service names:

```text
frontend -> backend:8000
backend  -> db:5432
```

The host machine uses the published ports:

```text
Frontend:   http://localhost:5173
Backend:    http://localhost:8000
PostgreSQL: localhost:5432
```

The frontend Nginx server proxies `/api/*` requests to the backend service.

---

## 4. Project Structure

```text
ad-campaign-manager/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── config/
│   │   ├── lib/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── index.ts
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   ├── prisma7.config.ts
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.ts
├── docker-compose.yml
├── .gitignore
└── README.md
```

`backend/src/generated/` contains generated Prisma Client code and is regenerated inside the backend container.

---

## 5. Quick Start with Docker Compose

### Prerequisites

Install:

- Docker Desktop, or Docker Engine with Docker Compose support;
- Git.

Node.js and npm are not required on the host when using the full Docker workflow.

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd ad-campaign-manager
```

### Step 2: Build and Start the Full Application

From the project root:

```bash
docker compose up --build -d
```

This starts:

- PostgreSQL 16;
- the Node.js / Express backend;
- the React frontend served by Nginx.

The backend waits for PostgreSQL to become healthy before starting.

The backend startup process also generates the Prisma Client, applies the existing Prisma migrations, and starts the Express server.

### Step 3: Load the Demo Campaigns

After all containers are running:

```bash
docker compose exec backend npm run seed
```

The seed script deletes existing `AdEvent` and `Campaign` rows, then creates a clean set of demo campaigns for evaluation.

Run this command whenever you want to reset the application to the default demo data.

### Step 4: Open the Application

Frontend:

```text
http://localhost:5173
```

Backend API:

```text
http://localhost:8000
```

PostgreSQL:

```text
localhost:5432
```

### Step 5: Check Container Status

```bash
docker compose ps
```

The expected services are:

```text
db
backend
frontend
```

The database service should report a healthy status.

---

## 6. Docker Commands

### Start Existing Images

```bash
docker compose up -d
```

### Rebuild After Code Changes

```bash
docker compose up --build -d
```

### Stop the Application

```bash
docker compose down
```

This removes the containers and Compose network but keeps the PostgreSQL named volume.

### Completely Remove Database Data

Only use this when a full database reset is intentionally required:

```bash
docker compose down -v
```

This also deletes the PostgreSQL named volume. Normally, use `docker compose down` without `-v`.

---

## 7. Demo Workflow

After starting the application and running the seed command, open:

```text
http://localhost:5173
```

### Campaign Dashboard

Use the dashboard to verify:

- campaign creation;
- campaign editing;
- total and daily budget changes;
- bid changes;
- pause / activate actions;
- campaign metrics.

### Ad Inspector: Auction and Targeting

Example visitor:

```text
User ID: demo_user
Country: AU
Device: mobile
Category: sports
```

With the default seed data, the highest-bidding eligible campaign should win.

### Ad Inspector: Impression and Click

After requesting an ad:

1. click `Simulate Impression`;
2. verify that impressions increase;
3. verify that spend increases by the campaign bid price;
4. click `Simulate Click`;
5. verify that clicks increase while spend remains unchanged.

### Ad Inspector: Frequency Cap

For the same user and campaign, request the ad and record impressions until 3 impressions have been recorded within the rolling 1-hour window. On the next request, that campaign is no longer eligible for that user, so another eligible campaign can win.

### Ad Inspector: No Match

For example:

```text
Country: JP
Device: tablet
Category: finance
```

If no campaign matches, the application returns a graceful no-ad result.

---

## 8. API Endpoints

### Campaign APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/campaigns` | Get all campaigns |
| GET | `/campaigns/:id` | Get one campaign |
| POST | `/campaigns` | Create a campaign |
| PATCH | `/campaigns/:id` | Update a campaign |

### Ad Delivery API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/ads/serve` | Select the winning eligible ad |

### Tracking APIs

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/events/impression` | Record an impression |
| POST | `/events/click` | Record a click |

---

## 9. Database Model

### Campaign

Stores creative information, targeting, total/daily budgets, bid price, active status, spend, impressions, and clicks.

### AdEvent

Stores individual delivery events, including unique event ID, campaign ID, user ID, event type, event cost, and creation time.

Prisma also creates the internal `_prisma_migrations` table to track migration history.

---

## 10. Implementation Notes

### Billing Model

The current prototype uses **Cost Per Impression (CPI)**.

Each successful impression increases campaign spend by the campaign bid price. Clicks update click metrics but do not add additional spend.

### Daily Budget

Daily spend is calculated using the UTC calendar day.

### Frequency Cap

The current default is:

```text
3 impressions per user per campaign
within a rolling 1-hour window
```

It is configurable in:

```text
backend/src/config/ad.config.ts
```

### Persistence

PostgreSQL is the persistent source of truth.

Docker Compose stores database data in a named volume, so normal `docker compose down` / `docker compose up` cycles preserve the database.

### Frontend State

The React frontend maintains local UI state. API requests and refresh actions retrieve the latest persisted data from the backend.

### No-Match Handling

When no campaign satisfies targeting, budget, activity, and frequency-cap rules, the ad-serving endpoint returns a no-ad result instead of failing the request.

---

## 11. Manual Development Mode

The Docker Compose workflow above is the recommended way to reproduce the full application.

For local development with frontend/backend hot reload, PostgreSQL can remain in Docker while Node.js and Vite run on the host.

### Start Only PostgreSQL

```bash
docker compose up -d db
```

### Backend

Create `backend/.env` with:

```env
DATABASE_URL="postgresql://aduser:adpassword@localhost:5432/admanager"
```

Then:

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run dev
```

Backend:

```text
http://localhost:8000
```

### Frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite development server:

```text
http://localhost:5173
```

During development, `vite.config.ts` proxies `/api/*` requests to the backend on port `8000`.

---

## 12. Useful Development Checks

Backend TypeScript check:

```bash
cd backend
npm run typecheck
```

Frontend lint:

```bash
cd frontend
npm run lint
```

---

## 13. Prototype Scope

The current implementation focuses on:

- campaign lifecycle management;
- campaign creative and targeting configuration;
- real-time eligibility filtering;
- highest-bid auction;
- CPI spend tracking;
- impression and click tracking;
- duplicate-event prevention;
- frequency capping;
- total and daily budget protection;
- concurrent impression handling;
- persistent PostgreSQL storage;
- full Docker Compose execution;
- interactive verification through the Ad Inspector.
