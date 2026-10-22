# Heroku Deployment Guide

Calessa is deployed on Heroku as two separate apps, with Cloudflare managing DNS and SSL.

## Live URLs

| Service | URL |
|---|---|
| Frontend (Next.js) | https://raissaandcaleb.com |
| Backend (NestJS API) | https://api.raissaandcaleb.com |
| Admin Dashboard | https://raissaandcaleb.com/dashboard |

## Heroku Apps

| App | Heroku Name | Repo Subdirectory |
|---|---|---|
| API | `calessa-api` | `api/` |
| Frontend | `calessa-web` | `web/` |

## Architecture

```
Cloudflare DNS (grey cloud / DNS only)
    ↓
raissaandcaleb.com  →  calessa-web (Heroku)
api.raissaandcaleb.com  →  calessa-api (Heroku)
    ↓
calessa-api → Heroku Postgres (essential-0)
```

> **Important:** Cloudflare must be set to **grey cloud (DNS only)** — NOT orange proxy. Orange proxy breaks Heroku's automatic SSL certificate provisioning.

## Heroku Add-ons

| Add-on | Plan | App |
|---|---|---|
| Heroku Postgres | `essential-0` | `calessa-api` |

## Environment Variables

### calessa-api

| Variable | Description |
|---|---|
| `DATABASE_PRISMA_URL` | Set automatically by Heroku Postgres (aliased from `DATABASE_URL`) |
| `JWT_SECRET` | Random secret for signing JWT tokens |
| `FRONTEND_URL` | `https://raissaandcaleb.com` (for CORS) |
| `PORT` | Set automatically by Heroku |
| `GOOGLE_CLIENT_ID` | Google OAuth (placeholder if not using OAuth) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `FACEBOOK_CLIENT_ID` | Facebook OAuth (placeholder if not using) |
| `FACEBOOK_CLIENT_SECRET` | Facebook OAuth |
| `TWITTER_CONSUMER_KEY` | X/Twitter OAuth (placeholder if not using) |
| `TWITTER_CONSUMER_SECRET` | X/Twitter OAuth |

> **Note:** Heroku manages `DATABASE_URL` for the Postgres add-on and will not allow it to be overwritten. The Prisma schema uses `DATABASE_PRISMA_URL` instead, which must be set as a copy of the Heroku-managed `DATABASE_URL`.

### calessa-web

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.raissaandcaleb.com` |
| `PORT` | Set automatically by Heroku |

> **Important:** `NEXT_PUBLIC_*` variables are **baked into the bundle at build time**. Changing them requires a full redeploy.

## Deployment

Both apps deploy from Git subtrees of the monorepo. Each has its own Heroku remote.

```bash
# Deploy API
git subtree push --prefix api heroku-api main

# Deploy Frontend
git subtree push --prefix web heroku-web main
```

If the subtree push says "Everything up-to-date" but you need to force a rebuild, make a trivial change to any tracked file (e.g., add a comment to `next.config.mjs`) and commit before pushing.

### Procfiles

**`api/Procfile`**
```
release: npx prisma migrate deploy
web: node dist/main.js
```
The `release` phase automatically runs database migrations on every deploy.

**`web/Procfile`**
```
web: npm run start
```

## Database

The production database is a fresh Heroku Postgres instance. Migrations are applied automatically via the `release` dyno command. **No seed data is loaded in production** — all content must be created through the admin dashboard.

To check migration status:
```bash
heroku run npx prisma migrate status --app calessa-api
```

To run a one-off command:
```bash
heroku run bash --app calessa-api
```

## Initial Admin Account

The seed script creates an admin user. In production, the admin account must be created manually:

1. Log in to the Heroku dashboard or use:
```bash
heroku run bash --app calessa-api
```
2. Register via the `/register` endpoint (or use the signup flow if enabled).

> Check `api/prisma/seed.ts` for default seed credentials used in development.

## Key Fixes Applied During Initial Deployment

These changes were made to the codebase to support Heroku deployment:

| File | Change | Reason |
|---|---|---|
| `api/tsconfig.build.json` | Added `rootDir: "src"` and `"include": ["src"]` | Without these, `tsc` scanned the whole project and produced no output silently |
| `api/package.json` | Changed `build` script from `nest build` to `tsc -p tsconfig.build.json` | `nest build` silently failed on Heroku Node 24 |
| `api/package.json` | Added `"engines": {"node": ">=20.0.0"}` | Pin Node version |
| `api/package.json` | Moved `passport-local` to `dependencies` | Was in `devDependencies`; Heroku prunes devDeps after build, causing runtime crash |
| `api/prisma/schema.prisma` | Changed `DATABASE_URL` to `DATABASE_PRISMA_URL` | Heroku manages `DATABASE_URL` for the Postgres add-on and refuses to let it be overwritten |
| `web/next.config.ts` → `web/next.config.mjs` | Renamed and rewrote as plain JS | TypeScript is a devDep pruned after build; `.ts` config throws `Cannot find module 'typescript'` at runtime |
| `web/package.json` | Added `"engines": {"node": ">=20.0.0"}` | Pin Node version |

## SSL

SSL is managed automatically by Heroku's ACM (Automated Certificate Management).

```bash
heroku certs:auto:enable --app calessa-api
heroku certs:auto:enable --app calessa-web
```

After enabling, Heroku provisions Let's Encrypt certificates for all custom domains attached to the app. This requires Cloudflare to be in **DNS only (grey cloud)** mode.

## Adding the Heroku Git Remotes (one-time setup)

If you're setting up on a new machine:

```bash
# From repo root
heroku git:remote -a calessa-api --remote heroku-api
heroku git:remote -a calessa-web --remote heroku-web
```

## Monitoring

```bash
# Live logs
heroku logs --tail --app calessa-api
heroku logs --tail --app calessa-web

# Dyno status
heroku ps --app calessa-api
heroku ps --app calessa-web
```
