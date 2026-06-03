# Calessa — Wedding Website

A wedding website and admin dashboard for Caleb & Raissa. Public guests can view details, browse the story and gallery, and submit RSVPs via a personal invite code. Authenticated admins manage guests, RSVPs, content, and seating from a protected dashboard.

## Features

- Public wedding pages: homepage, story, details, schedule, FAQ, gallery, contact
- Guest RSVP via unique invitation code — no account needed
- Admin dashboard: guest management, RSVP tracking, seating, content, CSV export
- Auth: email/password + Google/Facebook/X OAuth, JWT sessions, profile management

## Stack

- **Frontend** — Next.js 15 (App Router, TypeScript, Tailwind CSS) — `web/`
- **Backend** — NestJS (TypeScript, Passport, JWT) — `api/`
- **Database** — PostgreSQL + Prisma ORM
- **OAuth** — `passport-oauth2` (generic, all URLs are env vars)
- **Local dev OAuth** — `oauth2-mock-server` (no real credentials needed)

## Local Development

### Prerequisites

- Docker (for Postgres)
- Node.js 20+

### First-time setup

```bash
# Start Postgres
docker run --name calessa-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=calessa -p 5432:5432 -d postgres:16

# Run DB migrations
cd api
npx prisma migrate deploy

# Copy env files
cp api/.env.example api/.env
```

### Starting everything

**Terminal 1 — Postgres**
```bash
docker start calessa-db
```

**Terminal 2 — Mock OAuth server** (runs on port 8080)
```bash
cd api
npm run mock:oauth
```

**Terminal 3 — API** (runs on port 3001)
```bash
cd api
npm run start:dev
```

**Terminal 4 — Frontend** (runs on port 3000)
```bash
cd web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Mock OAuth accounts

The local OAuth server returns a distinct profile per provider, keyed by `client_id`. The default profiles are defined in [`api/scripts/mock-oauth-server.ts`](api/scripts/mock-oauth-server.ts):

| Provider | Client ID (`api/.env`) | Mock email |
|----------|------------------------|------------|
| Google   | `mock-google-client-id`   | mockuser.google@example.com |
| Facebook | `mock-facebook-client-id` | mockuser.facebook@example.com |
| X        | `mock-x-client-id`        | mockuser.x@example.com |

To change a mock profile, edit the `PROFILES` map in `mock-oauth-server.ts` and restart the mock server. Each entry sets the `sub`, `email`, and `name` returned by the userinfo endpoint for that provider.

No real credentials are needed in development. To switch to real providers, replace the `*_AUTH_URL`, `*_TOKEN_URL`, `*_USERINFO_URL`, `*_CLIENT_ID`, and `*_CLIENT_SECRET` values in `api/.env` with credentials from Google Cloud Console, Facebook Developer Portal, or X Developer Portal.

## Running Tests

**Backend unit tests**
```bash
cd api
npm test
```

**Backend E2E tests** (requires the test DB to be set up — see `api/.env.test.example`)
```bash
cd api
npm run test:e2e:setup   # first time only — runs migrations against calessa_test
npm run test:e2e
```

**Frontend unit tests**
```bash
cd web
npm test
```

## Project Structure

```
.
├── web/          # Next.js frontend
│   └── src/
│       ├── app/
│       │   ├── dashboard/        # Protected dashboard + profile page
│       │   └── auth/callback/    # OAuth callback handler
│       └── components/           # LoginForm, AuthProviderButtons
├── api/          # NestJS backend
│   ├── src/auth/ # Auth controller, service, strategies, guards, DTOs
│   ├── src/users/# Users service
│   ├── prisma/   # Schema and migrations
│   └── test/     # E2E tests (supertest, real test DB)
└── docs/         # Architecture and design decision docs
```
