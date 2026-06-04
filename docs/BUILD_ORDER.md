# Wedding Website Build Order

Based on `wedding_website_ai_build_spec.md`. Each phase should be fully runnable before moving to the next.

## Phase 1 — Foundation (Backend + DB)

- [x] Add all Prisma models to `api/prisma/schema.prisma`
- [x] Generate and run migration
- [x] Add seed data (settings, FAQs, schedule, guests, RSVPs, gallery, seating tables)
- [x] NestJS module: `wedding-settings` (CRUD)
- [x] NestJS module: `guests` (CRUD + invitation code generation + bulk create)
- [x] NestJS module: `rsvp` (public submit/update, admin CRUD)
- [ ] NestJS module: `public` (unauthenticated read endpoints)
- [ ] NestJS module: `admin` (summary, CSV export)
- [ ] NestJS modules for content: `events`, `schedule`, `faq`, `gallery`, `story-timeline`, `contact`, `seating`

## Phase 2 — Public Website (Frontend)

- [ ] Public layout with navigation (Home, Story, Details, Schedule, RSVP, FAQ, Gallery, Contact)
- [ ] Homepage (`/`) — hero, countdown, CTAs, highlights
- [ ] Our Story page (`/story`) — story body + timeline
- [ ] Wedding Details page (`/details`) — ceremony, reception, dress code, map
- [ ] Schedule page (`/schedule`) — ordered day-of timeline
- [ ] RSVP page (`/rsvp` and `/rsvp/[code]`) — full form with validation
- [ ] FAQ page (`/faq`) — accordion or list
- [ ] Gallery page (`/gallery`) — photo grid + lightbox
- [ ] Contact page (`/contact`) — contact persons list

## Phase 3 — Admin Dashboard (Frontend + Admin APIs)

- [ ] Dashboard overview (`/dashboard`) — summary cards, recent RSVPs
- [ ] Wedding settings (`/dashboard/settings`)
- [ ] Guest management (`/dashboard/guests`) — CRUD, bulk import (CSV/paste), RSVP link copy, filters
- [ ] RSVP management (`/dashboard/rsvps`) — view, filter, manual edit
- [ ] CSV export — guests and RSVPs

## Phase 4 — Seating + Content Polish

- [ ] Seating management (`/dashboard/seating`) — tables, assignments, unassigned view
- [ ] Content management (`/dashboard/content`) — story, FAQs, gallery, schedule, events, contact
- [ ] Messages and song requests (`/dashboard/messages`)
- [ ] Loading states and empty states across all pages
- [ ] Mobile responsiveness pass

## Phase 5 — Tests + Hardening

- [ ] Unit tests: RSVP validation (party size, deadline, status rules)
- [ ] E2E test: public RSVP submission via `/rsvp/[code]`
- [ ] E2E test: protected admin routes reject unauthenticated requests
- [ ] Test: invalid RSVP code returns graceful error
- [ ] Test: CSV export correctness
- [ ] Security review: no guest data leaked through public endpoints

---

## Notes

- Existing auth (JWT, OAuth, profile management) must remain untouched throughout.
- Schema uses `@default(uuid())` to match existing conventions (spec shows cuid — ignore that).
- Tailwind v4, NestJS v11, Next.js 15, Prisma 5 — no version upgrades needed.
- No email sending, file upload, or payment providers until after MVP.
- Use placeholder image URLs until real assets are provided.
