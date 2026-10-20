# Wedding Website Build Order

Based on `wedding_website_ai_build_spec.md`. Each phase should be fully runnable before moving to the next.

## Phase 1 — Foundation (Backend + DB)

- [x] Add all Prisma models to `api/prisma/schema.prisma`
- [x] Generate and run migration
- [x] Add seed data (settings, FAQs, schedule, guests, RSVPs, gallery, seating tables)
- [x] NestJS module: `wedding-settings` (CRUD)
- [x] NestJS module: `guests` (CRUD + invitation code generation + bulk create)
- [x] NestJS module: `rsvp` (public submit/update, admin CRUD)
- [x] NestJS module: `public` (unauthenticated read endpoints)
- [x] NestJS module: `admin` (summary, CSV export)
- [x] NestJS modules for content: `events`, `schedule`, `faq`, `gallery`, `story-timeline`, `contact`, `seating`

## Phase 2 — Public Website (Frontend)

- [x] Public layout with navigation (Home, Story, Details, Schedule, RSVP, FAQ, Gallery, Contact)
- [x] Homepage (`/`) — hero, countdown, CTAs, highlights
- [x] Our Story page (`/story`) — story body + timeline
- [x] Wedding Details page (`/details`) — ceremony, reception, dress code, map
- [x] Schedule page (`/schedule`) — ordered day-of timeline
- [x] RSVP page (`/rsvp` and `/rsvp/[code]`) — full form with validation
- [x] FAQ page (`/faq`) — accordion or list
- [x] Gallery page (`/gallery`) — photo grid + lightbox
- [x] Contact page (`/contact`) — contact persons list

## Phase 3 — Admin Dashboard (Frontend + Admin APIs)

- [x] Dashboard overview (`/dashboard`) — summary cards, recent RSVPs
- [x] Wedding settings (`/dashboard/settings`)
- [x] Guest management (`/dashboard/guests`) — CRUD, bulk import (CSV/paste), RSVP link copy, filters
- [x] Guest detail page (`/dashboard/guests/[id]`) — full profile, RSVP details, seating assignment
- [x] RSVP management (`/dashboard/rsvps`) — view, filter, manual edit
- [x] CSV export — guests and RSVPs

## Phase 4 — Seating + Content Polish

- [x] Seating management (`/dashboard/seating`) — tables, assignments, unassigned view
- [x] Content management (`/dashboard/content`) — story, FAQs, gallery, schedule, events, contact
- [x] Messages and song requests (`/dashboard/messages`)
- [x] RSVP page text management — added `rsvpTagline` and `rsvpSubtext` fields to `WeddingSettings` (Prisma + migration), exposed via `wedding-settings` module, passed from `RsvpPage` server component to `RsvpEntryPage`, surfaced in `/dashboard/settings` (singleton fields, same pattern as `heroImageUrl`/`monogramUrl` — not `/dashboard/content`, which is for repeatable item lists)
- [x] Loading states and empty states across all pages — audited every page; dashboard and most public pages already had adequate handling, added `web/src/app/(public)/loading.tsx` as the one real gap (public route group had no Suspense fallback during page data fetches)
- [x] Mobile responsiveness pass — audited all 8 public pages at 375×812 via Playwright (no horizontal overflow, no console errors); fixed lightbox close button overlapping the global hamburger nav button in `GalleryGrid.tsx`, and bumped two undersized tap targets on the homepage (hero RSVP CTA, "View full details" link) to meet the ~44px touch-target guideline
- [x] Admin-configurable color theme — added 9 color fields to `WeddingSettings` (Prisma + migration), surfaced as color pickers (swatch + hex input) in `/dashboard/settings` → Theme Colors, applied at runtime via inline `style` with CSS custom properties on the `(public)` layout root. Also fixed several hardcoded hex colors on the homepage that didn't reference any variable (so theme changes had no effect on them), removed the unused `--rose` variable, and made hero-photo overlay text/scrim themeable so the text stays legible if the hero photo changes

## Phase 5 — Tests + Hardening

- [x] Unit tests: RSVP validation (party size, deadline, status rules) — `rsvp.service.spec.ts` already covered most of this; added the 4 real gaps found: party-size boundary (exactly equal to `allowedPartySize` should not throw), the missing MAYBE+0-attendees branch, and two tests asserting the actual `upsert` create/update payloads (previously only checked that `upsert` was called, never with what — the create-vs-update-on-resubmit distinction was unverified)
- [x] E2E test: public RSVP submission via `/rsvp/[code]` — `rsvp.e2e-spec.ts` already covered the happy path, party size, plus-one, and MAYBE-not-allowed through real HTTP requests; added 3 tests exercising the settings-dependent rules (RSVPs disabled → 422, deadline passed → 422, MAYBE allowed when enabled → 201) that were previously only verified at the unit-test level, not through the actual HTTP/validation pipeline
- [x] E2E test: protected admin routes reject unauthenticated requests — already broadly covered (401-without-token tests across `guests`, `content`, `wedding-settings`, `admin`, and `rsvp` e2e specs, including a loop covering all 6 content sub-resources); found and closed the one gap — `/admin/seating` had no explicit 401 test despite being `JwtAuthGuard`-protected like everything else
- [x] Test: invalid RSVP code returns graceful error — already covered (404 for both `GET` and `POST /public/rsvp/:code` with a bad code)
- [x] Test: CSV export correctness — existing unit tests only checked substrings (headers present, quotes escaped); added a small RFC 4180 parser in `admin.service.spec.ts` to verify actual row/column structure survives a comma or embedded newline inside a free-text value (name, group, notes, message) — proving the unconditional per-cell quoting is correct, not just that it looks plausible. Also found the e2e spec never seeded any guest/RSVP data, so the export endpoints were only ever proven to return headers — added a guest with a comma in their name and verified both `/admin/export/guests.csv` and `/admin/export/rsvps.csv` return real, correctly-quoted data end-to-end
- [x] Security review: no guest data leaked through public endpoints — audited every controller's guard placement (all 12 confirmed correctly behind `JwtAuthGuard`) and every public service method's field selection. Found and fixed two real gaps: (1) `RsvpService.getByCode`/`submitByCode` never checked the site-wide `isPublic` toggle, unlike every other public method (`PublicService`'s `assertSitePublic` pattern) — fixed by checking it first, before even looking up the guest, so an "offline" site doesn't leak whether a given invitation code is valid; (2) `main.ts` CORS read `process.env.WEB_URL`, a variable that's never actually set anywhere (`FRONTEND_URL` is the real one), so CORS always silently fell back to a hardcoded `localhost:3000` origin regardless of environment — fixed to read `FRONTEND_URL`. Fixing (1) exposed a pre-existing test-hygiene bug: `wedding-settings.e2e-spec.ts` permanently flips `isPublic` to `false` with no reset, which the persistent test DB carries across separate `npm run test:e2e` runs — added defensive resets. Also verified: `Guest` field selection already correctly excludes email/phone/group/notes/invitationCode from `getByCode`'s response; `WeddingEvent.notes`/`ContactPerson.notes` looked like leaked admin-only fields at first but are confirmed intentionally public (rendered on `/details` and `/contact`); `forbidNonWhitelisted` + DTO shape prevents a guest from injecting `guestId` to hijack another guest's RSVP; `JWT_SECRET` has no insecure hardcoded fallback. Known, intentionally-unfixed gap: no rate-limiting on any public endpoint — consistent with the app's existing posture everywhere, would be its own separate decision (`@nestjs/throttler`)
- [ ] Soft deletes — all delete actions across the app should mark records as deleted (e.g. `deletedAt DateTime?`) rather than hard-removing them, so data can be recovered if needed

## Phase 6 — Post-Launch Enhancements

Not required to launch — revisit after the site is live.

- [ ] Gallery file upload (admin + guest) — let admins and guests upload real photo files instead of pasting URLs, with an AI-assisted moderation check on guest submissions. Full design in `docs/GALLERY_UPLOADS.md`

---

## Notes

- Existing auth (JWT, OAuth, profile management) must remain untouched throughout.
- Schema uses `@default(uuid())` to match existing conventions (spec shows cuid — ignore that).
- Tailwind v4, NestJS v11, Next.js 15, Prisma 5 — no version upgrades needed.
- No email sending, file upload, or payment providers until after MVP.
- Use placeholder image URLs until real assets are provided.
