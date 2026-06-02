# Auth API

NestJS authentication backend for a generic, cloneable auth template. Provides local email/password auth, OAuth (Google, Facebook, X), JWT sessions, and profile management.

## Endpoints

### Public

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/auth/register` | Create a local account |
| `POST` | `/auth/login` | Sign in, returns `{ access_token }` |
| `GET` | `/auth/oauth/:provider` | Redirect to OAuth provider (`google`, `facebook`, `x`) |
| `GET` | `/auth/callback/:provider` | OAuth callback — issues JWT, redirects frontend |

### Protected (Bearer token required)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/auth/me` | Current user profile (`userId`, `email`, `name`, `hasPassword`, `createdAt`) |
| `PATCH` | `/auth/profile` | Update display name |
| `PATCH` | `/auth/password` | Change password (requires existing password) |
| `GET` | `/auth/providers` | List linked OAuth providers |
| `GET` | `/auth/link/:provider` | Get OAuth URL to link a provider (returns `{ url }`) |
| `GET` | `/auth/link/callback/:provider` | Complete provider link flow |
| `DELETE` | `/auth/providers/:provider` | Unlink a provider |
| `DELETE` | `/auth/profile` | Delete account |

## Environment Variables

Copy `.env.example` to `.env` and fill in values. At minimum:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/auth_template?schema=public
JWT_SECRET=<random-string>     # required — app will not start if missing
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

For OAuth in local dev, use the mock server values already set in `.env.example`. For production, replace the `*_AUTH_URL`, `*_TOKEN_URL`, `*_USERINFO_URL`, `*_CLIENT_ID`, and `*_CLIENT_SECRET` values for each provider.

## Running locally

```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate deploy

# Start the mock OAuth server (port 8080) — terminal 1
npm run mock:oauth

# Start the API (port 3001) — terminal 2
npm run start:dev
```

## Running tests

```bash
# Unit tests (75+ cases)
npm test

# Unit tests with coverage
npm run test:cov

# E2E tests (scaffold — see api/test/app.e2e-spec.ts)
npm run test:e2e
```

## Database

Uses PostgreSQL via Prisma. Two models:

- **`User`** — email, optional password (bcrypt), name, timestamps
- **`LinkedProvider`** — join table allowing multiple OAuth providers per account

Schema: `prisma/schema.prisma`  
Migrations: `prisma/migrations/`

## Mock OAuth server

`scripts/mock-oauth-server.ts` runs an `oauth2-mock-server` on port 8080 that returns a distinct profile per provider, keyed by `client_id`. No real credentials are needed in development.

To customize mock profiles, edit the `PROFILES` map in `mock-oauth-server.ts` and restart.
