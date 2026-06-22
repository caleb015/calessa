# Gallery File Upload (Admin + Guest) — Design

**Status: not implemented.** This documents the design so it's ready to build after the site is published. No dependencies are installed, no migration exists, no code has been written for this yet.

## Why

The gallery currently only supports pasting an image URL string — `GalleryImage.imageUrl` is just a `String`, managed entirely through `/dashboard/content`. There's no real file upload anywhere in the app. The goal is to let both admins and wedding guests upload actual photo files, with an AI-assisted check to make moderating guest submissions easy.

Guests have no accounts — they're identified only by their personal `invitationCode` (the same one used for RSVP). Anyone with a valid code should be able to submit a photo, but submissions need review before going public, since there's no login gating who can submit.

## Decisions

- **Guest uploads are gated on `isPublic`** (the whole-site-offline switch), matching every other public endpoint's `assertSitePublic` pattern in `PublicService` — but **not** gated on `isRsvpEnabled`, since gallery submissions are a separate concern from RSVP.
- **Guest-submitted photos default to `isPublished: false`** (pending). Admin approves via the existing `/dashboard/content` → Gallery tab, which already has an `isPublished` toggle — no new moderation page needed, just enough context to make an informed call.
- **AI moderation is a second, independent signal alongside human approval, not a replacement for it.** It annotates each pending photo with a verdict so admin can scan submissions quickly, but a human still flips `isPublished`.
- **Guest caption maps to `GalleryImage.description`**; `title` stays null for admin to fill in later.
- **Storage backend stays swappable** — local disk for now (no cloud credentials decided yet; Google Drive and AWS are both still on the table), behind a one-method seam.
- **No rate-limiting** on either new endpoint — matches the existing RSVP public endpoints' posture (which also have none); not a new gap introduced by this feature.

## Schema additions

On `GalleryImage`:
```prisma
uploadedByGuestId String?
uploadedByGuest   Guest?   @relation(fields: [uploadedByGuestId], references: [id], onDelete: SetNull)
moderationVerdict String?  // e.g. "appropriate" | "flagged"
moderationReason  String?
```
On `Guest`, the back-relation:
```prisma
submittedPhotos GalleryImage[]
```
`onDelete: SetNull` so deleting a guest doesn't cascade-delete photos they submitted — just orphans the attribution.

## Storage seam

New `api/src/storage/storage.service.ts`, exactly one method:

```ts
upload(file: Express.Multer.File): Promise<string> // returns a public URL
```

Default implementation: write to `path.join(process.cwd(), 'uploads', 'gallery')`, return `/uploads/gallery/<filename>`.

**Important:** use `process.cwd()`, not `__dirname`. `nest-cli.json` compiles to `dist/src/`, and `deleteOutDir: true` wipes `dist/` on every build — an `__dirname`-relative uploads folder would silently lose every file on the next build/deploy. `process.cwd()` reliably resolves to `api/` for both `nest start --watch` and `node dist/main`.

Filename: `${randomUUID()}${ext}`, where `ext` comes from a `MIME_TO_EXT` whitelist map keyed by the validated mimetype — never derive the extension from the client-supplied `originalname` (path-traversal safety).

This method is the **only place to touch** when swapping providers later — S3, GCS, Vercel Blob, or Google Drive all just mean reimplementing this one method's body to call that provider's SDK/API and return the resulting URL.

A new generic admin endpoint sits in `api/src/storage/storage.controller.ts`:
```
POST /admin/upload   (JwtAuthGuard, multipart "file" field, returns { url })
```
Deliberately gallery-agnostic — the dashboard's `'image'` field type is shared by both the Gallery and Story sections in `dashboard/content/page.tsx`, so one generic upload endpoint avoids forking that shared component.

## Moderation seam

New `api/src/moderation/moderation.service.ts`, exactly one method:

```ts
checkImage(buffer: Buffer): Promise<{ appropriate: boolean; reason?: string }>
```

Default/stub implementation: always returns `{ appropriate: true }` — a no-op until a real provider is configured, so the upload feature works without any API key. Realistic options for the real implementation: OpenAI's moderation endpoint (supports image input), Google Cloud Vision SafeSearch, or AWS Rekognition content moderation. Whichever is chosen needs an API key/credential env var, named consistently with this project's existing convention (`SCREAMING_SNAKE_CASE`, grouped — e.g. `MODERATION_PROVIDER`, `MODERATION_API_KEY`).

**Call site:** in `gallery-submissions.service.ts`, after `storage.upload()`, call `moderation.checkImage()` and persist the verdict (`moderationVerdict`/`moderationReason`) on the new `GalleryImage` row. A failed or unavailable moderation call must **not** block the upload — leave the verdict fields null and let the human reviewer proceed normally. Moderation is a convenience signal, not a gate.

## New backend module: `api/src/gallery-submissions/`

Mirrors `api/src/rsvp/`'s invitation-code lookup pattern exactly:

```ts
// gallery-submissions.service.ts
async submitByCode(code: string, file: Express.Multer.File, dto: SubmitGalleryPhotoDto) {
  const guest = await this.prisma.guest.findUnique({ where: { invitationCode: code } });
  if (!guest) throw new NotFoundException('Invitation code not found');

  const settings = await this.prisma.weddingSettings.findUnique({ where: { id: 'singleton' } });
  if (settings && !settings.isPublic) {
    throw new ServiceUnavailableException('The website is not currently available');
  }

  const imageUrl = await this.storage.upload(file);
  const verdict = await this.moderation.checkImage(file.buffer).catch(() => null);

  return this.prisma.galleryImage.create({
    data: {
      imageUrl,
      description: dto.caption,
      isPublished: false,
      uploadedByGuestId: guest.id,
      moderationVerdict: verdict?.appropriate === false ? 'flagged' : verdict ? 'appropriate' : null,
      moderationReason: verdict?.reason,
    },
  });
}
```

Route: `POST /public/gallery-submissions/:code`, multipart, optional `caption` field (`SubmitGalleryPhotoDto`: `@IsOptional() @IsString() @MaxLength(200) caption?: string`). `BadRequestException` if no file is attached.

## Validation (both upload endpoints)

- Multer file-size limit: 10MB.
- Mimetype whitelist: jpeg, png, webp, gif. Reject anything else via `fileFilter`.
- Extension for the stored filename always comes from the mimetype map (see Storage seam above), never from the client.

## `main.ts`

```ts
const app = await NestFactory.create<NestExpressApplication>(AppModule);
app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
```
Same `process.cwd()` reasoning as the storage seam.

## Frontend

The existing `adminApi`/`publicApi` JSON helpers (`web/src/lib/adminApi.ts`, `web/src/lib/api.ts`) hardcode `Content-Type: application/json` and `JSON.stringify` the body — both would break a multipart `FormData` upload (the browser needs to set its own boundary header). New upload functions should be **additive siblings**, not modifications to the shared `request`/`post` helpers:

- `adminApi.uploadImage(file: File): Promise<{ url: string }>` — POSTs `FormData` to `/admin/upload`, attaches the existing bearer token, omits `Content-Type`.
- `publicApi.submitGalleryPhoto(code: string, file: File, caption?: string)` — POSTs `FormData` to `/public/gallery-submissions/:code`.

**Admin UI**: extend the `field.type === 'image'` branch in `dashboard/content/page.tsx`'s `FormField` component with a file-picker control next to the existing URL text input. On upload success, set the field's value to the returned URL (the existing `ImagePreview` thumbnail picks it up automatically). Benefits the Story section too, since it shares the same field type.

**Guest UI**: new `web/src/components/public/GalleryUploadForm.tsx` (client component), rendered below `<GalleryGrid>` on `/gallery`. Invitation code + file picker + optional caption. States: idle → submitting → success ("Thanks! Your photo will appear here once approved.") or a clear inline error (invalid code, upload failure, file too large/wrong type).

**Admin moderation context**: `content.service.ts`'s `findAllGallery()` adds `include: { uploadedByGuest: { select: { primaryName: true } } }`, and the Gallery section's `itemSublabel` in `dashboard/content/page.tsx` shows the submitter's name plus the moderation verdict (if present) so admin has context before toggling `isPublished`.

## `.gitignore`

```
/api/uploads/*
!/api/uploads/.gitkeep
```
Create an empty `api/uploads/.gitkeep` at implementation time so the directory exists in fresh checkouts despite being otherwise ignored.

## Known gaps / follow-ups

- **No rate-limiting** on either upload endpoint — consistent with the existing RSVP public endpoints, not a new gap, but worth revisiting in a broader hardening pass.
- **Local disk storage does not survive serverless redeploys.** Production deployment must swap the storage seam to real cloud storage (S3, GCS, Vercel Blob, or Google Drive) before going live — local disk is for development only.
- **`CLAUDE.md` will need updating** once this ships — it currently states "No email sending, file upload, or payment providers in MVP."

## Implementation order (for whoever builds this)

1. `npm install --save-dev @types/multer` in `api/` (runtime `multer` already ships transitively via `@nestjs/platform-express`).
2. Schema + migration (additions above).
3. `storage` module (service + controller + spec).
4. `moderation` module (service + spec) — stub implementation first.
5. `gallery-submissions` module (service + controller + dto + spec), wired to both of the above.
6. `content.service.ts` include + `main.ts` static assets + `.gitignore`.
7. Frontend: API client functions, admin upload control, guest upload form.
8. `CLAUDE.md` update.

Steps 1–6 are backend-only and independently testable via `npm test` in `api/` before any frontend work starts.
