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

- [ ] Unit tests: RSVP validation (party size, deadline, status rules)
- [ ] E2E test: public RSVP submission via `/rsvp/[code]`
- [ ] E2E test: protected admin routes reject unauthenticated requests
- [ ] Test: invalid RSVP code returns graceful error
- [ ] Test: CSV export correctness
- [ ] Security review: no guest data leaked through public endpoints
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
