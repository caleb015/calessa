# Details Page Redesign — Implementation Plan (v3)

Goal: rebuild **`/details`** to match the mockup, fully editable from the dashboard.
The homepage keeps its current design; it only switches its card label from Type to Tagline.

## Decisions so far

| # | Decision |
|---|---|
| 1 | Scope is `/details` only |
| 2 | Events get a **Tagline** field; **Type is removed** (it only acted as a label since "Show on homepage" replaced its matching job) |
| 3 | Cards show **start time \| venue** only — end time, address, notes are dropped from cards |
| 4 | Header, Dress Code and CTA text are **all editable** |
| 5 | Dress Code gets **its own Content tab and its own settings**, with unlimited guidelines; the Details Page tab keeps Header + CTA |

## Target layout

```
            THE WEDDING                       ← eyebrow (editable)
              Details                         ← title (editable)
   📅 12 February 2027    📍 Antipolo, Rizal   ← date from Settings · location (editable)
            Add to Calendar                   ← toggle

┌ WHERE FOREVER BEGINS ─────┐ ┌ ONE MORE DRINK(S) ────────┐   ← event Tagline
│ Ceremony & Reception      │ │ Afterparty Celebration    │   ← event Title
│ 4:30 PM | Emerald Events  │ │ 9:00 PM | Pavo Villa      │   ← start time | venue
│              View on map →│ │              View on map →│   ← mapUrl (if set)
└───────────────────────────┘ └───────────────────────────┘
┌ COME IN COLOR! ─────────────────────────────────────────┐
│ The Dress Code · intro text                             │   ← Dress Code (toggle)
│ For the Ladies: … / note · For the Gentlemen: …         │   ← guideline rows
│ 🖌️ 🖌️ 🖌️ 🖌️ 🖌️ 🖌️                                       │   ← palette swatches
└─────────────────────────────────────────────────────────┘
          Want to see the Full Day?                          ← CTA heading/subtext/button (toggle)
          [ View the Day's Schedule → ]                       → /schedule
```

Colors come from the existing site theme: eyebrows use **Accent**, time/venue use **Muted**,
so Settings → Theme keeps controlling the look.

## 0. Protecting live data

The site has real content and guests now. Every change follows these rules:

- **Additive only.** New tables and new optional columns. No `DROP`, no renames, no type
  changes, no rewriting existing values (the one copy below *adds* data, it never overwrites).
- **"Removing" Type = stop using it, not delete it.** The column stays in the database
  (made optional) so its data is always recoverable. Physically dropping it is a separate,
  later step that only happens with your explicit OK and a fresh backup — or never.
- **Backup before every deploy that includes a migration:**
  `heroku pg:backups:capture --app calessa-api` (+ `pg:backups:download` for an off-Heroku copy).
  Today there are **no backups**, and the plan doesn't support point-in-time rollback.
- **Rehearse on a copy of production first:** restore the latest backup into a local
  database, run the new migration against it, and compare row counts and Raissa's
  taglines before/after. Only then deploy.
- **Review every migration's SQL** before committing; anything destructive is a stop.
- **Deploys only run `prisma migrate deploy`** (Procfile `release`). If a migration fails,
  Heroku keeps the previous release running. Never run `migrate dev`, `migrate reset`,
  `db push`, or the seed script against production — the seed would add sample guests.
- **New single-row tables are created on first save** from the dashboard; nothing is
  pre-filled into production.
- **Verify after deploy:** row counts per table match, and the live pages look unchanged.

## 1. Data model (one migration)

**`WeddingEvent`**
- add `tagline String?`
- copy each event's current `type` into `tagline` (only where tagline is empty)
- make `type` optional and stop using it in code — **the column and its values stay**
  (hand-written SQL; Raissa's labels carry over and nothing changes visually)

**New `DetailsPage`** (single row, like Settings — kept separate so the Settings save
can't break again the way it did with the invite fields)

| Field | Default when blank |
|---|---|
| `headerEyebrow`, `headerTitle` | "The Wedding", "Details" |
| `location` | hidden |
| `showAddToCalendar` (bool) | on |
| `ctaEnabled` (bool) | on |
| `ctaHeading`, `ctaSubtext`, `ctaButtonLabel` | mockup wording |

**New `DressCode`** (single row, its own settings — independent of the Details Page row)

| Field | Default when blank |
|---|---|
| `enabled` (bool) | off — section hidden until turned on |
| `eyebrow`, `title`, `intro` | hidden if blank |
| `palette` (list of hex colors) | no swatches |

**New `DressCodeGuideline`** (unlimited rows): `label`, `text`, `note?`, `displayOrder`
— e.g. "For the Ladies", "For the Gentlemen", "For Kids", "Entourage"…

## 2. API

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET/PATCH /admin/details-page` | admin | header + CTA copy and toggles |
| `GET/PATCH /admin/dress-code` | admin | dress code settings + palette |
| `GET/POST/PATCH/DELETE /admin/dress-code-guidelines` | admin | guideline rows (same pattern as Contact/FAQ) |
| `GET /public/details-page` | public* | everything `/details` needs: page copy, dress code (if enabled) + guidelines |
| `GET /public/calendar.ics` | public* | calendar file: wedding day from first event start → last event end, with location |
| events DTOs | — | `tagline` added (optional, ≤100 chars); `type` no longer accepted or shown |

\* Respects "Site is public", like every other public endpoint.

**Add to Calendar:** a small menu with **Google Calendar** (pre-filled link) and
**Apple / Outlook (.ics)**. A plain `.ics` link alone is clunky for Gmail users on desktop.

## 3. Dashboard

- **Content → new "Details Page" tab:** Header and Call to Action cards, plus a "View page →" link.
- **Content → new "Dress Code" tab:**
  - **Settings card** at the top: show/hide toggle, eyebrow, title, intro, and a palette editor
    (add/remove/reorder colors with the existing color picker).
  - **Guidelines list** below, using the same add/edit/delete list as FAQ or Contact —
    add as many as you like, ordered by Display Order.
- **Content → Events:** the Type field becomes **Tagline** (optional); list shows tagline · venue.

## 4. Public page (`/details`)

- Rebuild `details/page.tsx` from small components: `DetailsHeader`, `EventCard`,
  `DressCode`, `BrushSwatch` (one SVG brush-stroke shape tinted per color), `DetailsCta`.
- Times and dates in Manila time; date styled "12 February 2027" as in the mockup.
- Mobile: cards stack, swatches wrap.
- Homepage Celebration cards: label switches from `type` → `tagline` (same text).

## 5. Tests

- **API unit:** `.ics` builder (times, escaping, no events, no location), details-page defaults.
- **API e2e:** new endpoints (auth, validation, public-off 503), settings round-trip still passes.
- **Migration test:** apply the migration to a database seeded with events that have `type`
  set, and assert every `type` value is still present and copied into `tagline`.
- **Web:** component tests for header (location/calendar hidden when off), cards
  (time | venue, map link only with URL), dress code (hidden when disabled/empty), CTA.
- Update existing tests/seed that still create events with `type`.

## 6. Rollout

Phases ship independently, each deployable. **Each phase with a migration follows the
checklist in section 0** (backup → rehearse on prod copy → review SQL → deploy → verify counts).

1. **Tagline swap** — migration, events DTO/editor, homepage + details label. *No visual change.*
2. **Header + cards + CTA** — DetailsPage model/endpoints, new layout, Add to Calendar.
3. **Dress Code** — guidelines, palette, swatches.
4. **Polish** — mobile pass, theme check against Raissa's colors.

Content defaults mean the page looks reasonable the moment each phase deploys;
Raissa then fills in location, dress code, etc. from the dashboard.

## Resolved during implementation

1. Date style: "12 February 2027" on `/details` only; the rest of the site is unchanged.
2. Add to Calendar: menu with **Google Calendar** and **Apple / Outlook (.ics)**.

## Status

All four phases implemented and verified **locally** (not committed, not deployed).
Production rollout follows section 0: backup → rehearse migrations on a copy of prod → deploy → verify.
