# Calessa — Wedding Website

## What This Is

A wedding website + admin dashboard for Caleb & Raissa, built on top of an existing full-stack auth template.

Full spec: `docs/wedding_website_ai_build_spec.md`
Build order and progress tracking: `docs/BUILD_ORDER.md`

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | Next.js 15 App Router, TypeScript, Tailwind CSS v4 — in `web/` |
| Backend | NestJS 11, TypeScript, Passport, JWT — in `api/` |
| Database | PostgreSQL + Prisma 5 ORM |
| Package managers | `pnpm` for web, `npm` for api |

## What Already Exists (Do Not Rebuild)

- Email/password auth, Google/Facebook/X OAuth, JWT sessions
- Profile management (name, password, provider linking, account deletion)
- Protected `/dashboard` route via Next.js middleware
- Prisma models: `User`, `LinkedProvider`
- NestJS modules: `auth`, `users`, `prisma`

## What We Are Building

A wedding website layered on top of the auth template. Three user types:

- **Public visitor** — reads homepage, story, details, schedule, FAQ, gallery, contact
- **Invited guest** — submits RSVP via `/rsvp/[code]` (no account needed)
- **Admin** — authenticated user who manages all content via `/dashboard`

## Key Conventions

- Schema uses `@default(uuid())` — the spec says cuid but we match existing conventions
- JWT token stored in `localStorage` as `access_token`, `logged_in` cookie for middleware
- Admin API endpoints require `JwtAuthGuard`, public endpoints do not
- NestJS pattern: module → controller → service → DTO, consistent with existing modules
- Tailwind only — no additional component libraries
- No email sending, file upload, or payment providers in MVP
- Use placeholder image URLs until real assets are provided

## Build Phases

See `docs/BUILD_ORDER.md` for the full checklist. Summary:

1. **Phase 1** — Prisma models, migration, seed data, NestJS modules (backend foundation)
2. **Phase 2** — All public-facing pages (homepage through contact)
3. **Phase 3** — Admin dashboard (overview, settings, guests, RSVPs, CSV export)
4. **Phase 4** — Seating management, content management, polish
5. **Phase 5** — Tests and hardening

## Running the Project

```bash
# API (from api/)
npm run start:dev

# Web (from web/)
pnpm dev

# Database migration
cd api && npx prisma migrate dev

# Seed database
cd api && npx prisma db seed
```

## Security Rules

- Admin endpoints must be protected by `JwtAuthGuard`
- Public RSVP lookup by code returns minimum guest data only (no full guest list)
- All inputs validated via class-validator DTOs
- No secrets in frontend code
