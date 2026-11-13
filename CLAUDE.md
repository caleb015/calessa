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
| Package managers | `npm` for both web and api |

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
- Email via Resend; image uploads go straight from the browser to Cloudinary, signed by `POST /admin/uploads/signature` (secret stays in `CLOUDINARY_URL` on the API); no payment providers
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
npm run dev

# Database migration (LOCAL ONLY)
cd api && npx prisma migrate dev

# Seed database (LOCAL ONLY — adds sample guests)
cd api && npx prisma db seed
```

## Production Data Safety

The live site (raissaandcaleb.com, Heroku app `calessa-api`, Postgres `essential-0`) holds real
wedding content and guest data. The plan has **no point-in-time rollback**, so lost data is gone.
Every change must minimize impact on existing data and never risk losing it.

- **Additive migrations only.** New tables and new optional columns. No `DROP`, renames, column
  type changes, or overwriting existing values. Data copies may only fill empty fields.
- **"Removing" a field = stop using it in code.** Keep the column and its values (make it optional).
  Physically dropping it is a separate step that needs explicit approval and a fresh backup.
- **Backup before every deploy that includes a migration:**
  `heroku pg:backups:capture --app calessa-api` (and `heroku pg:backups:download` for an off-Heroku copy).
- **Rehearse on a copy of production:** restore the latest backup into a local database, run the
  migration against it, and compare row counts and key values before/after. Then deploy.
- **Review each migration's SQL before committing.** Anything destructive is a stop — ask first.
- **Production only ever runs `prisma migrate deploy`** (Procfile `release` phase; a failed migration
  keeps the previous release running). Never run `migrate dev`, `migrate reset`, `db push`, or the
  seed script against production.
- **No pre-filling production.** New single-row tables are created on first save from the dashboard.
- **Don't write to production data while testing** unless explicitly asked; read-only checks are fine.
- **Verify after deploy:** row counts per table match and live pages look unchanged.

## Security Rules

- Admin endpoints must be protected by `JwtAuthGuard`
- Public RSVP lookup by code returns minimum guest data only (no full guest list)
- All inputs validated via class-validator DTOs
- No secrets in frontend code
