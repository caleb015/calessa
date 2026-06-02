# Phase 2: Generic Auth Web App Template

**Date:** 2026-03-20 (updated 2026-05-27)
**Status:** Feature-complete — production credentials pending
**Goal:** Build a reusable, cloneable authentication template

---

## Project Scope (This Phase)

Build a **generic web app template** with:
- ✅ Generic Next.js login UI (completed)
- ✅ Generic branding via environment variables (completed)
- ✅ NestJS auth backend — local email/password complete
- ✅ User persistence via PostgreSQL + Prisma (complete)
- ✅ JWT token management (complete)
- ✅ End-to-end local auth flow + dashboard redirect (complete)
- ✅ OAuth providers — Google, Facebook, X implemented (mock server for dev)
- ✅ Frontend callback page + provider conflict error handling
- ✅ Profile management — display name, change password, link/unlink OAuth providers, delete account
- ✅ Unit tests — backend (auth controller, auth service, users service, OAuth strategies) + frontend (LoginForm, AuthCallback, AuthProviderButtons, ProfilePage)
- ✅ E2E tests — guard enforcement (401 no token / bad token, 2xx with valid token) against a real test DB (`auth_template_test`) via supertest
- ⏳ Production OAuth credentials (Google Cloud, Facebook Developer, X Developer Portal)

---

## Architecture (This Phase)

```
auth-template/
├── web/                       # Next.js 15 login UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx              (generic, env-branded)
│   │   │   └── AuthProviderButtons.tsx    (anchor tags → backend OAuth routes)
│   │   ├── config/
│   │   │   └── app.ts                     (app name/subtitle from env)
│   │   ├── app/
│   │   │   ├── page.tsx                   (login page)
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx               (post-auth dashboard)
│   │   │   │   └── profile/page.tsx       (profile management)
│   │   │   └── auth/callback/page.tsx     (receives ?token= or ?error= from backend)
│   │   └── __tests__/
│   │       ├── LoginForm.test.tsx
│   │       ├── AuthProviderButtons.test.tsx
│   │       ├── AuthCallback.test.tsx
│   │       └── ProfilePage.test.tsx
│   ├── jest.config.ts
│   ├── jest.setup.ts
│   ├── .env.example
│   └── package.json
│
├── api/                       # NestJS auth service
│   ├── src/
│   │   ├── auth/
│   │   │   ├── dto/
│   │   │   │   ├── register.dto.ts
│   │   │   │   ├── login.dto.ts
│   │   │   │   ├── update-profile.dto.ts
│   │   │   │   └── change-password.dto.ts
│   │   │   ├── guards/jwt-auth.guard.ts
│   │   │   ├── google.strategy.ts         (passport-oauth2, env-driven URLs)
│   │   │   ├── facebook.strategy.ts
│   │   │   ├── x.strategy.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── local.strategy.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   └── auth.module.ts
│   │   ├── users/
│   │   │   ├── users.service.ts
│   │   │   └── users.module.ts
│   │   └── app.module.ts
│   ├── scripts/
│   │   └── mock-oauth-server.ts           (oauth2-mock-server, port 8080)
│   ├── prisma/
│   │   ├── schema.prisma                  (User + LinkedProvider models)
│   │   └── migrations/
│   ├── test/
│   │   ├── auth.e2e-spec.ts               (27 E2E tests — guard enforcement + happy paths)
│   │   ├── setup-env.ts                   (loads .env.test before app boots)
│   │   └── jest-e2e.json
│   ├── .env.example
│   ├── .env.test.example
│   └── package.json
│
├── docs/
│   ├── PHASE_2.md                         (this file)
│   ├── PHASE_2_LOCAL_AUTH.md
│   ├── PHASE_2_GOOGLE_OAUTH.md
│   └── PHASE_2_PROFILE_MANAGEMENT.md
│
└── README.md
```

---

## Implementation Checklist (Phase 2)

### Backend (`api/`)
- [x] Prisma schema — `User` (email, name, password, timestamps) + `LinkedProvider` table
- [x] `auth.service.ts` — local auth + OAuth user find-or-create + JWT login
- [x] JWT generation and validation via `@nestjs/jwt` + `JwtStrategy`
- [x] `LocalStrategy` — email/password via bcrypt
- [x] Auth endpoints:
  - `POST /auth/register` — create local user
  - `POST /auth/login` — local login, returns JWT
  - `GET /auth/me` — returns `{ userId, email, name, hasPassword, createdAt }` from DB
  - `GET /auth/oauth/google|facebook|x` — Passport-guarded redirect to provider
  - `GET /auth/callback/google|facebook|x` — receives code, issues JWT, redirects frontend
- [x] Profile endpoints (all `JwtAuthGuard`-protected):
  - `PATCH /auth/profile` — update display name
  - `PATCH /auth/password` — change password (gated on `hasPassword`)
  - `GET /auth/providers` — list linked providers
  - `GET /auth/link/:provider` — returns OAuth URL for linking (JSON, not redirect)
  - `GET /auth/link/callback/:provider` — completes link flow via signed state JWT
  - `DELETE /auth/providers/:provider` — unlink provider (guards last login method)
  - `DELETE /auth/profile` — delete account (cascades to LinkedProvider)
- [x] CORS configured
- [x] `GoogleStrategy`, `FacebookStrategy`, `XStrategy` via `passport-oauth2` (all URLs are env vars)
- [x] `ConflictException` on email conflict — message does not reveal existing provider
- [x] `JWT_SECRET` uses `configService.getOrThrow` — app crashes on startup if unset
- [x] Mock OAuth server (`scripts/mock-oauth-server.ts`) — per-provider profiles, port 8080
- [x] Unit tests: auth controller (21), auth service (20), users service (19), strategies = 76 backend tests
- [x] E2E tests — `api/test/auth.e2e-spec.ts` (27 cases, real test DB)
- [ ] `POST /auth/logout` endpoint (currently handled client-side only)

### Frontend (`web/`)
- [x] LoginForm POSTs to `/auth/login` and `/auth/register`
- [x] JWT stored in localStorage; `logged_in` cookie set for middleware
- [x] Dashboard: fetches `/auth/me` to validate session, shows email; Profile link in header
- [x] Logout: clears localStorage + cookie, redirects to login
- [x] Middleware protects `/dashboard/:path*` via `logged_in` cookie
- [x] `AuthProviderButtons` — Google, Facebook, X anchor tags pointing to backend OAuth routes
- [x] `/auth/callback` page — stores token + cookie on `?token=`, shows error UI on `?error=`
- [x] Profile page — display name, change password (show/hide, confirm field), connect/disconnect providers, delete account modal
- [x] Unit tests: LoginForm (17), AuthProviderButtons (6), AuthCallback (7), ProfilePage (15) = 45 frontend tests

### Testing
- [x] Local email/password login end-to-end
- [x] Registration flow
- [x] Invalid credentials show error message
- [x] Token persistence across page reloads
- [x] Logout clears session
- [x] OAuth flow working end-to-end via mock server (all 3 providers)
- [x] Provider conflict (same email, different provider) handled gracefully
- [x] Profile management — name update, password change, link/unlink, delete
- [ ] OAuth flow with real production credentials
- [x] E2E guard tests — unauthenticated requests return 401

### Documentation
- [ ] `SETUP.md` — step-by-step to run locally
- [x] `.env.example` — `api/` and `web/`
- [x] `README.md` — setup, mock OAuth, running tests, project structure
- [ ] OAuth provider setup guide (Google Cloud Console, Facebook Developer, X Developer Portal)
- [ ] Deployment notes

---

## Environment Variables

### `api/.env.example`
```env
PORT=3001
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://user:password@localhost:5432/auth_template?schema=public
JWT_SECRET=                          # required — app will not start if missing
JWT_EXPIRES_IN=7d

# Dev: start mock server with `npm run mock:oauth`, use values below as-is
# Prod: replace with real credentials from each provider's developer portal
GOOGLE_CLIENT_ID=mock-google-client-id
GOOGLE_CLIENT_SECRET=mock-client-secret
GOOGLE_AUTH_URL=http://localhost:8080/authorize
GOOGLE_TOKEN_URL=http://localhost:8080/token
GOOGLE_USERINFO_URL=http://localhost:8080/userinfo
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/callback/google
GOOGLE_LINK_CALLBACK_URL=http://localhost:3001/auth/link/callback/google

FACEBOOK_APP_ID=mock-facebook-client-id
FACEBOOK_APP_SECRET=mock-client-secret
FACEBOOK_AUTH_URL=http://localhost:8080/authorize
FACEBOOK_TOKEN_URL=http://localhost:8080/token
FACEBOOK_USERINFO_URL=http://localhost:8080/userinfo
FACEBOOK_CALLBACK_URL=http://localhost:3001/auth/callback/facebook
FACEBOOK_LINK_CALLBACK_URL=http://localhost:3001/auth/link/callback/facebook

X_API_KEY=mock-x-client-id
X_API_SECRET=mock-client-secret
X_AUTH_URL=http://localhost:8080/authorize
X_TOKEN_URL=http://localhost:8080/token
X_USERINFO_URL=http://localhost:8080/userinfo
X_CALLBACK_URL=http://localhost:3001/auth/callback/x
X_LINK_CALLBACK_URL=http://localhost:3001/auth/link/callback/x
```

### `web/.env.example`
```env
NEXT_PUBLIC_APP_NAME=My App
NEXT_PUBLIC_APP_SUBTITLE=Welcome
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Success Criteria

✅ Complete when:
1. User can log in via email/password or any OAuth provider
2. JWT token stored and validated
3. Dashboard accessible post-login; profile page functional
4. Logout clears session
5. `README.md` has clear setup + customization steps
6. Repo is ready to mark as GitHub template

---

## After Phase 2: Phase 3 (app-specific features)

Once Phase 2 is stable:
- Add `lesson_plans`, `lesson_plan_versions` tables to Prisma
- Build lesson plan CRUD endpoints in `api/`
- Add lesson plan UI to `web/` dashboard
- Customize branding for the target app
- Integrate AI generation endpoints (Claude API)

---

## Repository State

**Current (2026-05-27):**
- `web/` — Next.js 15, pnpm; login/register/dashboard/profile all wired to API ✅
- `api/` — NestJS; local auth + OAuth (Google, Facebook, X) + full profile management ✅
- Mock OAuth server on port 8080 for local dev (no real credentials needed) ✅
- `LinkedProvider` table supports multiple providers per account ✅
- 76 backend unit tests + 45 frontend unit tests + 27 E2E tests ✅
- `JWT_SECRET` required at startup via `getOrThrow` — no silent weak default ✅
- Prisma migrations applied, running in Docker Postgres ✅
- Workspace on WSL native filesystem ✅

**Next:**
- Wire up real production credentials
- Write `SETUP.md`

---

## Quick Commands

```bash
# Postgres (Docker)
docker start auth-db

# Mock OAuth server (terminal 1)
cd api && npm run mock:oauth

# Backend (terminal 2)
cd api && npm run start:dev

# Frontend (terminal 3)
nvm use 20 && cd web && pnpm dev

# Tests
cd api && npm test
nvm use 20 && cd web && pnpm test
```

---

## References

- [Passport.js Strategies](http://www.passportjs.org/)
- [NestJS JWT](https://docs.nestjs.com/recipes/jwt)
- [Prisma User Guide](https://www.prisma.io/docs/)
