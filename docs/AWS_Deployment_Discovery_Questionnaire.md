# AWS Deployment Discovery Questionnaire

Use this document to answer, edit, or remove questions as needed. The
goal is to determine the most cost-effective AWS architecture for your
wedding website based on your existing codebase.

------------------------------------------------------------------------

## 1. Project Overview

**What is the purpose of the application beyond the public wedding website?**

Calessa is a wedding website for Caleb & Raissa. It has two layers:

1. A **public wedding site** (homepage, story, details, schedule, FAQ,
   gallery, contact) readable by anyone.
2. An **admin dashboard** (`/dashboard`) for a single administrator
   (Caleb) to manage all content, guests, RSVP responses, seating,
   and site-wide settings (theme colors, hero image, RSVP text, etc.)
   via a password-protected web UI.

**Which features are currently implemented?**

- Email/password auth + Google, Facebook, and X OAuth (JWT sessions)
- Public pages: homepage, story, details, schedule, FAQ, gallery, contact
- Guest RSVP via `/rsvp/[invitationCode]` — no account required
- Admin dashboard: overview, wedding settings (colors, hero image,
  RSVP config), guest management, RSVP list, seating chart, content
  management (story sections, gallery images, FAQ items, schedules,
  contact/details text)
- Site-wide `isPublic` toggle to take the site offline
- Admin-configurable color theme (9 CSS custom properties)
- Admin-configurable hero image position and height
- CSV export of RSVP responses

**Which features are planned but not yet implemented?**

- Soft deletes (`deletedAt`) on all delete actions (Phase 5 remainder)
- Gallery file upload for admins and guests with AI-assisted moderation
  (Phase 6 — design complete in `docs/GALLERY_UPLOADS.md`, deferred
  until after the site is published)

------------------------------------------------------------------------

## 2. Technology Stack

### Frontend

- **Framework:** Next.js 15 (App Router)
- **Version:** 15.5.18 (React 19.2.3)
- **Package manager:** npm
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4

### Backend

- **Framework:** NestJS 11
- **Runtime:** Node.js (no explicit engine version pinned in
  `package.json`; LTS 20.x or 22.x is expected)
- **Package manager:** npm
- **Language:** TypeScript

------------------------------------------------------------------------

## 3. Repository Structure

```text
calessa/                   ← monorepo root (no workspace tooling)
├── api/                   ← NestJS backend
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── src/
│   │   ├── admin/         ← admin module (guests, RSVPs, export)
│   │   ├── auth/          ← JWT + OAuth
│   │   ├── content/       ← story, gallery, FAQ, schedule
│   │   ├── prisma/        ← PrismaService
│   │   ├── public/        ← public read endpoints
│   │   ├── rsvp/          ← guest RSVP by code
│   │   ├── seating/       ← seating chart
│   │   ├── users/
│   │   └── wedding-settings/
│   ├── test/              ← e2e tests
│   └── docker-compose.yml ← DB services only (dev + test postgres)
├── web/                   ← Next.js frontend
│   └── src/
│       ├── app/
│       │   ├── (public)/  ← public-facing pages + layout
│       │   └── dashboard/ ← admin UI (server components + client forms)
│       ├── components/
│       ├── lib/           ← API client helpers
│       └── types/
└── docs/
```

The two apps are **separate processes** — there is no monorepo tooling
(no Turborepo, Nx, etc.). They share no code packages between them.

------------------------------------------------------------------------

## 4. Database

- **Engine:** PostgreSQL 16
- **ORM:** Prisma 5
- **Development port:** 5433 (docker-compose service `calessa-db`)
- **Test port:** 5434 (docker-compose service `calessa-db-test`)
- **Approximate DB size after the wedding:** Very small — the data is
  entirely content-driven. Expect under 5 MB total:
  - ~200–300 guest records
  - ~200–300 RSVP responses
  - Dozens of content rows (gallery images, FAQ items, story sections,
    schedule entries)
  - A single `WeddingSettings` singleton row
- No large blobs in the database. Images are stored as URL strings
  (currently pointing at static assets or paste-in URLs).

------------------------------------------------------------------------

## 5. Authentication

- **Method:** JWT issued by NestJS, stored in `localStorage` as
  `access_token`. A `logged_in` cookie (non-HttpOnly, value `"true"`)
  lets the Next.js middleware redirect unauthenticated users away from
  `/dashboard` without reading the JWT itself.
- **Token expiry:** 7 days (configurable via `JWT_EXPIRES_IN` env var)
- **Social logins:** Yes — Google, Facebook, and X (Twitter) OAuth via
  Passport.js strategies
- **User roles:** Two:
  - **Admin** — authenticated user; all `/admin/*` API routes require
    `JwtAuthGuard`
  - **Guest / Public** — unauthenticated; RSVP is keyed by an
    invitation code, no account needed
- There is currently only one admin account (Caleb).

------------------------------------------------------------------------

## 6. Storage

**Current state (MVP):** No file uploads. All images are referenced by
URL strings (`imageUrl String` fields in the Prisma schema). The admin
pastes URLs directly into the dashboard.

**Planned (Phase 6, post-launch):** File upload for gallery images —
both admin uploads and guest photo submissions. Design documented in
`docs/GALLERY_UPLOADS.md`. The storage backend is behind a one-method
seam (`StorageService.upload(file): Promise<string>`) so the provider
(local disk → S3 / GCS / Vercel Blob) can be swapped without touching
call sites. Local disk is development-only; production will require a
real cloud storage provider before the upload feature goes live.

**Files that exist today:**
- Static images checked into `web/public/images/` (hero photos, etc.)
- No user-uploaded files, no database blobs, no S3 buckets

------------------------------------------------------------------------

## 7. Email

**Not implemented.** No email is sent anywhere in the application —
no welcome emails, no RSVP confirmations, no password-reset emails.
The `CLAUDE.md` spec explicitly excludes email as an MVP feature.

If email is desired post-launch, the codebase has no email provider
wired up and no env vars for one. Starting from scratch with SES,
Resend, or SendGrid would all be equally low-friction.

------------------------------------------------------------------------

## 8. Image Handling

- **Static assets:** Yes — hero photos and other images live in
  `web/public/images/`. Served directly by Next.js.
- **Next.js Image optimization:** Yes — `<Image>` from `next/image`
  is used throughout public pages with `fill`, `priority`, and `sizes`
  props. This requires either a Node.js server (not static export) or
  a CDN that supports Next.js Image optimization (e.g. Vercel, or
  configuring a custom loader for CloudFront).
- **User-uploaded images:** Not in MVP. Planned for Phase 6 — see
  Section 6.
- **`next.config.ts` image domains:** Check `web/next.config.ts` for
  any `images.remotePatterns` entries; update them when real image
  hosts are chosen.

------------------------------------------------------------------------

## 9. Deployment Assumptions

**Local service connections:**

| From → To | Local URL | Env var |
|---|---|---|
| Browser → Next.js frontend | `http://localhost:3000` | — |
| Next.js (server) → NestJS API | `http://localhost:3001` | `NEXT_PUBLIC_API_URL` |
| NestJS → PostgreSQL (dev) | `postgresql://postgres:postgres@localhost:5433/calessa` | `DATABASE_URL` |
| NestJS → PostgreSQL (test) | `postgresql://postgres:postgres@localhost:5434/calessa_test` | `DATABASE_URL` (overridden in `.env.test`) |

**Key environment variables (API — `api/.env`):**

```
PORT=3001
FRONTEND_URL=http://localhost:3000     # used for CORS origin
DATABASE_URL=postgresql://...
JWT_SECRET=<secret>
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/callback/google
# (same pattern for Facebook, X)
```

**Key environment variables (Web — `web/.env.local`):**

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

In production, `FRONTEND_URL` on the API side must match the deployed
frontend origin (for CORS), and `NEXT_PUBLIC_API_URL` on the frontend
must point at the deployed API.

------------------------------------------------------------------------

## 10. Docker

- **`docker-compose.yml`:** Yes — located at `api/docker-compose.yml`.
  Defines two services: `db` (dev, port 5433) and `db-test` (port 5434),
  both using `postgres:16`. Volumes are named (`calessa_db_data`,
  `calessa_db_test_data`). **This is for local development only** — the
  file header says so explicitly.
- **Dockerfile for the API:** None. The API has no Dockerfile.
- **Dockerfile for the frontend:** None. The frontend has no Dockerfile.
- **Kubernetes:** No.

For AWS deployment, both the API and frontend will need either
Dockerfiles written from scratch (for ECS/EKS) or a PaaS-style deploy
(e.g. Elastic Beanstalk, App Runner, or Amplify for the frontend).

------------------------------------------------------------------------

## 11. Runtime Characteristics

**Frontend (Next.js 15 App Router):**

- **Primary mode: Server-Side Rendering (SSR)** — public pages use
  Next.js Server Components, which fetch data from the API on the
  server at request time.
- **ISR (Incremental Static Regeneration):** Yes — public data fetches
  use `revalidate: 60` (1-minute cache), so the server regenerates
  pages in the background without a full SSR hit on every request.
- **Not a static export** — Next.js Image optimization and Server
  Components require a running Node.js process (or a platform that
  emulates one, like Lambda@Edge / CloudFront Functions with the
  Next.js adapter).
- **Admin dashboard:** Mostly client-side (React state, `use client`
  components), but still requires the Next.js server process for
  routing and the initial HTML shell.

**Backend (NestJS):**

- Standard HTTP server (Express under the hood). Long-running Node.js
  process. No WebSockets, no scheduled jobs, no background workers in
  the current codebase.

------------------------------------------------------------------------

## 12. Expected Traffic

| Metric | Estimate |
|---|---|
| Total invited guests | ~200–300 |
| Expected unique visitors | ~300–500 (guests + partners + parents checking) |
| Peak concurrent users | 20–50 (right after invitations go out) |
| Expected site usage window | ~6–12 months (invitation send → post-wedding) |
| Post-wedding traffic | Near zero (site can be taken offline via `isPublic` toggle) |

This is a low-traffic site. It will see short spikes (when the
invitation link goes out, when the RSVP deadline approaches) with
near-zero baseline traffic outside those windows.

------------------------------------------------------------------------

## 13. Administration

- **Who administers the site:** Caleb (the groom)
- **Number of admins:** 1
- Admin access is via `/dashboard`, protected by JWT auth. There is no
  role-management UI — any authenticated user gets admin access. In
  practice this is fine since only one person will ever log in.

------------------------------------------------------------------------

## 14. Performance Requirements

Ranked most → least important for this use case:

1. **Lowest monthly cost** — it's a personal wedding site with minimal
   traffic and a finite lifespan. Keeping the bill small matters most.
2. **Minimal maintenance** — the site needs to just work without
   ongoing ops work. Managed services strongly preferred.
3. **Simplicity** — fewer moving parts means fewer things to debug.
4. **Easy deployment** — ideally a single `git push` or CLI command.
5. **Fast response time** — important enough (guests shouldn't see a
   spinner for seconds), but the ISR cache means most public pages are
   already fast.
6. **Security** — standard web security is assumed; no special
   compliance requirements.
7. **High availability** — minor downtime (seconds during deploys) is
   acceptable for a personal site.
8. **Automatic scaling** — not needed; traffic is predictable and small.

------------------------------------------------------------------------

## 15. CI/CD

**Currently: none.** There is no CI/CD pipeline. Deployment is manual.

The repo appears to live locally (or on GitHub — check `git remote
-v`). There are no GitHub Actions workflows, no `.github/` directory,
and no pipeline config files of any kind in the codebase.

------------------------------------------------------------------------

## 16. Existing Infrastructure

*These questions cannot be answered from the codebase — please fill in:*

- **AWS Account:** Do you already have one? [ ]
- **Route 53 Hosted Zone:** [ ]
- **Domain name:** Do you have one (e.g. `calebandraissa.com`)? [ ]
  If so, where is it registered (GoDaddy, Namecheap, Route 53, etc.)?
- **SSL certificates:** Any existing ACM certs? [ ]
- **GitHub repository:** Is the code already pushed to GitHub? [ ]
  If yes, provide the repo URL.
- **Existing AWS resources:** Any VPCs, RDS instances, S3 buckets,
  or other infrastructure already created? [ ]

------------------------------------------------------------------------

## 17. Configuration Files

**`api/package.json` (key deps):**
- `@nestjs/core: ^11.1.17`, `@nestjs/passport`, `passport-jwt`,
  `passport-google-oauth20`, `passport-facebook`, `passport-twitter-oauth2`
- `@prisma/client: ^5.x`, `class-validator`, `class-transformer`
- Runtime: Node.js (no explicit version constraint)

**`web/package.json` (key deps):**
- `next: 15.5.18`, `react: 19.2.3`, `react-dom: 19.2.3`
- `typescript`, `tailwindcss`

**Dockerfiles:** None (see Section 10).

**`api/docker-compose.yml`:** See Section 10. Dev/test Postgres only.

**`api/prisma/schema.prisma`:** Key models:
- `User`, `LinkedProvider` (auth template, unchanged)
- `WeddingSettings` (singleton: colors, hero image, RSVP config, toggles)
- `Guest`, `Invitation`, `RsvpResponse` (guest list + RSVP)
- `Table`, `Seat` (seating chart)
- `StorySection`, `GalleryImage`, `FaqItem`, `ScheduleItem`,
  `ContactInfo`, `WeddingDetail` (content management)

**`api/.env.example`** (secrets redacted):
```
PORT=3001
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/calessa?schema=public
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/callback/google
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
FACEBOOK_CALLBACK_URL=http://localhost:3001/auth/callback/facebook
TWITTER_CONSUMER_KEY=...
TWITTER_CONSUMER_SECRET=...
TWITTER_CALLBACK_URL=http://localhost:3001/auth/callback/twitter
```

------------------------------------------------------------------------

## 18. Anything Else

**Things that affect infrastructure decisions:**

- **No scheduled jobs or background workers.** The API is a plain
  synchronous HTTP server — no queues, no cron tasks, no workers.
- **No WebSockets.** All communication is standard HTTP request/response.
- **No payment integration, no video streaming, no analytics.**
- **No email.** (See Section 7.)
- **QR code check-in:** Not implemented, but the invitation code system
  (`Guest.invitationCode`) could support a QR-based RSVP flow trivially
  — the code is already the URL parameter for `/rsvp/[code]`. A QR
  code is just a printed URL, no server-side feature needed.
- **Finite lifespan.** The site has a clear end-of-life (post-wedding).
  Infrastructure should be easy to tear down, not assumed to run forever.
- **OAuth callback URLs are environment-specific.** When the domain is
  known, the Google/Facebook/X developer console callback URLs must be
  updated from `localhost:3001` to the production API domain. Plan for
  this before going live.
- **Next.js requires a Node.js runtime** (not a pure static export) due
  to Server Components and the `<Image>` optimization pipeline. This
  rules out S3 + CloudFront alone for the frontend — you need Lambda,
  App Runner, ECS, or a service like Amplify Hosting that runs a
  Next.js compute layer.
- **Phase 6 storage decision:** When gallery file upload is implemented,
  local disk won't survive container restarts or serverless cold starts.
  S3 is the natural choice in an AWS deployment — just swap the
  `StorageService.upload()` implementation to use the AWS SDK. Plan an
  S3 bucket at deployment time even if it's not used until Phase 6.
