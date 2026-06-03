# Wedding Website + Admin Dashboard Build Spec

## Project Context

You are extending an existing public full-stack authentication template:

Repository: `https://github.com/caleb015/auth-template`

The existing template already includes:

- Frontend: Next.js 15 App Router, TypeScript, Tailwind CSS in `web/`
- Backend: NestJS, TypeScript, Passport, JWT in `api/`
- Database: PostgreSQL + Prisma ORM
- Authentication: email/password login, OAuth login, JWT sessions
- Protected dashboard route
- Profile management dashboard

Do not rebuild authentication from scratch. Use the existing auth, user, protected route, and project structure as the base.

## Product Goal

Build a wedding website and admin dashboard for Caleb and Raissa.

The website should serve as the public-facing source of information for wedding guests, while the admin dashboard should allow the couple to manage guests, RSVPs, wedding details, website content, seating assignments, and optional guest submissions.

The application should feel elegant, clean, romantic, modern, and mobile-first. Prioritize usability over visual complexity.

## Core User Roles

### Public Visitor

Can view public wedding information such as the homepage, story, schedule, venue, FAQ, and gallery.

### Invited Guest

Can access a personalized RSVP page using a unique invitation code or link.

Can submit RSVP details, meal preferences, allergies, plus-one details if allowed, messages, and optional song requests.

### Admin User

Authenticated user from the existing auth system.

Can access the protected admin dashboard and manage all wedding website data.

For the initial version, any authenticated dashboard user can be treated as an admin unless role-based access already exists. If roles are added, implement `ADMIN` and `USER` roles.

## Required Public Website Pages

### 1. Homepage

Route: `/`

Include:

- Couple names: Caleb & Raissa
- Wedding date placeholder
- Hero section with image placeholder
- Countdown timer
- Primary CTA: RSVP
- Secondary CTA: View Details
- Short welcome message
- Highlights for ceremony, reception, dress code, and location

Admin-manageable content:

- Couple names
- Wedding date
- Hero image URL
- Welcome message
- Display toggles for sections

### 2. Our Story

Route: `/story`

Include:

- Short story section
- Timeline milestones
- Photo placeholders

Admin-manageable content:

- Story title
- Story body
- Timeline items: date, title, description, image URL

### 3. Wedding Details

Route: `/details`

Include:

- Ceremony date/time
- Ceremony venue name
- Ceremony address
- Reception date/time
- Reception venue name
- Reception address
- Dress code
- Map link/embed placeholder
- Parking and transportation notes

Admin-manageable content:

- All event details
- Map links
- Notes

### 4. Schedule

Route: `/schedule`

Include:

- Ordered wedding day timeline
- Example entries: guest arrival, ceremony, cocktails, reception, dinner, program, after-party

Admin-manageable content:

- Schedule items: time, title, description, location, display order

### 5. RSVP

Routes:

- `/rsvp`
- `/rsvp/[code]`

Behavior:

- If a guest opens `/rsvp/[code]`, pre-load guest/invitation data.
- If the code is invalid, show a graceful error and contact instruction.
- Guests should not need to create an account.
- Guests can submit or update their RSVP until the RSVP deadline.

RSVP form fields:

- Attending: yes / no / maybe if enabled
- Guest name confirmation
- Email address
- Phone number optional
- Number of attendees, limited by invitation allowance
- Plus-one name if plus-one is allowed
- Meal preference if enabled
- Dietary restrictions/allergies
- Message to couple
- Song request optional

Validation:

- Cannot exceed allowed party size
- Required fields should be clearly marked
- Prevent duplicate RSVP confusion by updating existing RSVP for the same invitation code

### 6. FAQ

Route: `/faq`

Include common questions:

- What time should I arrive?
- What should I wear?
- Can I bring a plus-one?
- Are children invited?
- Is there parking?
- How do I RSVP?
- Who can I contact?

Admin-manageable content:

- FAQ items: question, answer, category, display order, published/unpublished

### 7. Gallery

Route: `/gallery`

Include:

- Photo grid
- Image modal/lightbox if simple to implement

Admin-manageable content:

- Images: title, description, image URL, display order, published/unpublished

### 8. Contact

Route: `/contact`

Include:

- Contact persons for bride side and groom side
- Optional coordinator contact
- Optional email/contact form, but do not send email unless SMTP or provider config is already available

Admin-manageable content:

- Contact name
- Role
- Email
- Phone
- Notes

## Required Admin Dashboard Sections

Use the existing protected dashboard as the starting point.

Suggested base route: `/dashboard`

### 1. Dashboard Overview

Display summary cards:

- Total invited guests
- Total invitations
- Confirmed attending
- Declined
- Pending RSVP
- Total expected headcount
- Meal counts
- Allergy count
- Plus-one count

Include recent RSVP submissions.

### 2. Wedding Settings

Admin route: `/dashboard/settings`

Manage:

- Couple names
- Wedding date
- RSVP deadline
- Site title
- Site description
- Hero image URL
- Public website visibility
- RSVP enabled/disabled
- Maybe option enabled/disabled
- Meal preference enabled/disabled
- Song request enabled/disabled
- Guestbook enabled/disabled

### 3. Content Management

Admin route: `/dashboard/content`

Manage content for:

- Homepage
- Our Story
- Wedding Details
- Schedule
- FAQ
- Gallery
- Contact

Use simple CRUD screens. Avoid overengineering a full CMS in v1.

### 4. Guest Management

Admin route: `/dashboard/guests`

Features:

- Create guest/invitation manually
- Edit guest details
- Delete guest/invitation
- Search and filter guests
- Track RSVP status
- Set allowed party size
- Set plus-one allowed yes/no
- Assign group/category: family, friends, work, entourage, etc.
- Generate unique invitation code
- Copy personalized RSVP link

Guest fields:

- Primary guest name
- Email
- Phone
- Group/category
- Allowed party size
- Plus-one allowed
- Invitation code
- Notes

### 5. RSVP Management

Admin route: `/dashboard/rsvps`

Features:

- View all RSVP responses
- Filter by status: attending, declined, pending, maybe
- View meal preferences
- View allergies/dietary restrictions
- Export CSV
- Manually update RSVP if needed

### 6. Seating Management

Admin route: `/dashboard/seating`

Features:

- Create tables
- Assign guests to tables
- View unassigned guests
- Search guests
- Optional public guest lookup later

Table fields:

- Table name/number
- Capacity
- Notes

### 7. Messages and Song Requests

Admin route: `/dashboard/messages`

Features:

- View guest messages
- View song requests
- Filter by type
- Export CSV optional

## Suggested Database Models

Use Prisma and PostgreSQL.

Add models similar to the following. Adjust to match the existing Prisma conventions.

```prisma
model WeddingSettings {
  id                    String   @id @default(cuid())
  coupleNameA           String   @default("Caleb")
  coupleNameB           String   @default("Raissa")
  weddingDate           DateTime?
  rsvpDeadline          DateTime?
  siteTitle             String?
  siteDescription       String?
  heroImageUrl          String?
  welcomeMessage        String?
  isPublic              Boolean  @default(true)
  isRsvpEnabled         Boolean  @default(true)
  allowMaybe            Boolean  @default(false)
  enableMealPreference  Boolean  @default(true)
  enableSongRequest     Boolean  @default(true)
  enableGuestbook       Boolean  @default(false)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model Guest {
  id                String   @id @default(cuid())
  primaryName       String
  email             String?
  phone             String?
  group             String?
  allowedPartySize  Int      @default(1)
  plusOneAllowed    Boolean  @default(false)
  invitationCode    String   @unique
  notes             String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  rsvp              Rsvp?
  seatingAssignment SeatingAssignment?
}

model Rsvp {
  id                  String   @id @default(cuid())
  guestId             String   @unique
  guest               Guest    @relation(fields: [guestId], references: [id], onDelete: Cascade)
  status              RsvpStatus
  attendeeCount       Int      @default(0)
  plusOneName         String?
  email               String?
  phone               String?
  mealPreference      String?
  dietaryRestrictions String?
  message             String?
  songRequest         String?
  submittedAt         DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

enum RsvpStatus {
  PENDING
  ATTENDING
  DECLINED
  MAYBE
}

model WeddingEvent {
  id           String   @id @default(cuid())
  type         String
  title        String
  venueName    String?
  address      String?
  startTime    DateTime?
  endTime      DateTime?
  mapUrl       String?
  notes        String?
  displayOrder Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model ScheduleItem {
  id           String   @id @default(cuid())
  timeLabel    String
  title        String
  description  String?
  location     String?
  displayOrder Int      @default(0)
  isPublished  Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model FaqItem {
  id           String   @id @default(cuid())
  question     String
  answer       String
  category     String?
  displayOrder Int      @default(0)
  isPublished  Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model GalleryImage {
  id           String   @id @default(cuid())
  title        String?
  description  String?
  imageUrl     String
  displayOrder Int      @default(0)
  isPublished  Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model StoryTimelineItem {
  id           String   @id @default(cuid())
  dateLabel    String?
  title        String
  description  String?
  imageUrl     String?
  displayOrder Int      @default(0)
  isPublished  Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model ContactPerson {
  id           String   @id @default(cuid())
  name         String
  role         String?
  email        String?
  phone        String?
  notes        String?
  displayOrder Int      @default(0)
  isPublished  Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model SeatingTable {
  id           String   @id @default(cuid())
  name         String
  capacity     Int?
  notes        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  assignments  SeatingAssignment[]
}

model SeatingAssignment {
  id        String       @id @default(cuid())
  guestId   String       @unique
  guest     Guest        @relation(fields: [guestId], references: [id], onDelete: Cascade)
  tableId   String
  table     SeatingTable @relation(fields: [tableId], references: [id], onDelete: Cascade)
  seatLabel String?
  notes     String?
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
}
```

## Backend API Requirements

Use NestJS modules, controllers, services, DTOs, guards, and Prisma service patterns consistent with the existing backend.

### Public APIs

These should not require authentication:

- `GET /public/settings`
- `GET /public/story`
- `GET /public/events`
- `GET /public/schedule`
- `GET /public/faqs`
- `GET /public/gallery`
- `GET /public/contact`
- `GET /public/rsvp/:code`
- `POST /public/rsvp/:code`

Public RSVP endpoint must validate the invitation code and allowed party size.

### Admin APIs

These should require JWT authentication:

- `GET /admin/summary`
- CRUD `/admin/settings`
- CRUD `/admin/guests`
- CRUD `/admin/rsvps`
- CRUD `/admin/events`
- CRUD `/admin/schedule`
- CRUD `/admin/faqs`
- CRUD `/admin/gallery`
- CRUD `/admin/story-timeline`
- CRUD `/admin/contact`
- CRUD `/admin/seating/tables`
- CRUD `/admin/seating/assignments`
- `GET /admin/export/rsvps.csv`
- `GET /admin/export/guests.csv`

## Frontend Requirements

Use the existing Next.js app structure.

### Design Direction

- Mobile-first responsive layout
- Elegant serif headings if available through existing font setup
- Clean cards and soft spacing
- Tailwind CSS only unless the project already uses another component library
- Use accessible contrast
- Avoid excessive animation

### Public Navigation

Include:

- Home
- Story
- Details
- Schedule
- RSVP
- FAQ
- Gallery
- Contact

### Admin Navigation

Include:

- Overview
- Settings
- Content
- Guests
- RSVPs
- Seating
- Messages

### Forms

Use reusable form components where practical:

- Text input
- Textarea
- Select
- Date/time input
- Toggle/switch
- Submit button
- Error alert
- Success alert

### API Client

Reuse the existing auth token handling from the template.

Create clear API helper functions for public and admin endpoints.

## Implementation Phases

### Phase 1: Foundation

- Inspect existing project structure
- Add Prisma models and migration
- Add seed data for wedding settings, sample FAQs, sample schedule, and sample guests
- Create backend modules for wedding settings, guests, RSVPs, public content, and admin summary

### Phase 2: Public Website

- Build homepage
- Build details page
- Build schedule page
- Build FAQ page
- Build RSVP page with invitation code support
- Add basic gallery and contact pages

### Phase 3: Admin Dashboard

- Build dashboard overview
- Build settings management
- Build guest management
- Build RSVP management
- Add CSV export

### Phase 4: Seating and Content Polish

- Build seating table management
- Build story timeline management
- Build gallery management
- Improve public UI styling
- Add empty states and loading states

### Phase 5: Testing and Hardening

- Add backend unit tests for RSVP validation
- Add e2e tests for public RSVP submission
- Test protected admin routes
- Test invalid RSVP code behavior
- Test party size validation
- Test CSV export

## Seed Data Requirements

Create seed data that makes local testing easy:

- Wedding settings for Caleb & Raissa
- Sample wedding date placeholder
- 5 FAQ items
- 6 schedule items
- 5 sample guests with different party sizes
- 2 sample RSVP submissions
- 3 sample gallery images using placeholder URLs
- 2 seating tables

## RSVP Business Rules

- Invitation code must be unique.
- A guest can only have one RSVP record.
- Submitting again with the same valid invitation code updates the existing RSVP.
- Attendee count must not exceed `allowedPartySize`.
- If status is `DECLINED`, attendee count should be `0`.
- If plus-one is not allowed, do not accept plus-one name.
- If RSVP deadline has passed, public submission should be blocked unless admin override is later implemented.
- Admin can edit RSVPs anytime.

## Security Requirements

- Do not expose admin APIs publicly.
- Do not expose all guest records through public endpoints.
- Public RSVP lookup by code should only return the minimum needed guest invitation data.
- Validate all inputs with DTOs.
- Sanitize or safely render user-submitted messages.
- Avoid storing secrets in frontend code.

## CSV Export Requirements

Provide CSV exports for:

### Guests CSV

Columns:

- Primary Name
- Email
- Phone
- Group
- Allowed Party Size
- Plus One Allowed
- Invitation Code
- RSVP Link
- Notes

### RSVPs CSV

Columns:

- Primary Guest Name
- RSVP Status
- Attendee Count
- Plus One Name
- Email
- Phone
- Meal Preference
- Dietary Restrictions
- Message
- Song Request
- Submitted At

## Acceptance Criteria

The build is successful when:

- Existing auth still works.
- Admin dashboard is protected.
- Public pages load without authentication.
- Admin can create/edit/delete guests.
- Admin can copy a personalized RSVP link.
- Guest can RSVP through `/rsvp/[code]` without logging in.
- RSVP summary counts are accurate.
- RSVP cannot exceed allowed party size.
- Admin can view and export RSVP responses.
- Website content can be edited from the dashboard or seeded clearly if full editing is deferred.
- UI is responsive on mobile and desktop.

## Development Rules

- Do not rewrite the full project structure unless necessary.
- Preserve the existing authentication flow.
- Prefer small, focused modules and reusable components.
- Use TypeScript strictly.
- Follow existing code style and naming conventions.
- Keep the first version practical and maintainable.
- Do not add payment, email sending, SMS, or file upload providers unless explicitly requested.
- Use placeholder image URLs for now.
- When uncertain, implement the simpler version first and leave TODO comments for optional enhancements.

## Optional Enhancements After MVP

Do not implement these until the core MVP works:

- Email invitations
- QR code invitation links
- Guest photo uploads
- Public seating lookup
- Password-protected public website
- Multi-language support
- Custom wedding hashtag section
- Countdown sharing card
- Print-ready guest list
- Entourage page
- Gift registry page
- Live event updates

## Final Output Expected From AI Builder

Produce working code changes in the existing repository with:

- Prisma schema updates and migration
- Backend NestJS modules/controllers/services/DTOs
- Public website pages
- Admin dashboard pages
- Seed data
- Basic tests where practical
- Clear README update describing how to run the wedding website locally
