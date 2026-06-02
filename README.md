# Auth Template

A reusable, full-stack authentication template with email/password login, OAuth social login, JWT sessions, and a profile management dashboard. Built to be cloned and customized as the auth foundation for any web app.

## Features

- Register and sign in with email + password
- Sign in with Google, Facebook, or X (Twitter)
- JWT-based sessions stored in localStorage
- Protected dashboard route (middleware + server-side token verification)
- Profile management: display name, change password, link/unlink OAuth providers, delete account
- Multi-provider accounts (link multiple OAuth providers to a single account)

## Stack

- **Frontend** — Next.js 15 (App Router, TypeScript, Tailwind CSS) — `web/`
- **Backend** — NestJS (TypeScript, Passport, JWT) — `api/`
- **Database** — PostgreSQL + Prisma ORM
- **OAuth** — `passport-oauth2` (generic, all URLs are env vars)
- **Local dev OAuth** — `oauth2-mock-server` (no real credentials needed)

## Local Development

### Prerequisites

- Docker (for Postgres)
- Node.js 20+ via nvm
- pnpm (frontend only)

### First-time setup

```bash
# Start Postgres
docker run --name auth-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=auth_template -p 5432:5432 -d postgres:16

# Run DB migrations
cd api
npx prisma migrate deploy

# Copy env files
cp api/.env.example api/.env
```

### Starting everything

**Terminal 1 — Postgres**
```bash
docker start auth-db
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
nvm use 20
cd web
pnpm dev
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
npm run test:e2e:setup   # first time only — runs migrations against auth_template_test
npm run test:e2e
```

**Frontend unit tests**
```bash
nvm use 20
cd web
pnpm test
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
