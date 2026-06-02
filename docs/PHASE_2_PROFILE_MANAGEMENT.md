# Phase 2: Profile Management

**Date:** 2026-05-26 (updated 2026-05-27)
**Status:** Complete
**Goal:** Add a profile page to the dashboard where users can view and edit their account details, change their password (local users only), link additional OAuth providers, and delete their account.

---

## Scope

| Feature | Local users | OAuth users |
|---|---|---|
| View profile (email, member since) | ✅ | ✅ |
| Update display name | ✅ | ✅ |
| Change password | ✅ | ❌ (no password set) |
| Link additional OAuth providers | ✅ | ✅ |
| Unlink a provider | ✅ (if another remains) | ✅ (if another remains) |
| Delete account | ✅ | ✅ |

OAuth providers: Google, Facebook, X.

---

## Key Design Decisions

### `LinkedProvider` table (instead of single provider on User)
Replaced `User.provider` / `User.providerId` columns with a `LinkedProvider` join table, allowing multiple providers per account.

### `primaryProvider` removed
Originally planned to track how the account was created. Removed as unnecessary — the change-password gate uses `user.password !== null` (`hasPassword` in JWT), and the conflict error no longer names the provider (see security note below).

### `GET /auth/link/:provider` returns JSON, not a redirect
Originally planned to redirect directly to the OAuth provider. Changed to return `{ url: string }` so the frontend can call it with a Bearer token via `fetch` (a browser `<a href>` cannot send an `Authorization` header).

### Security: conflict error does not reveal provider name
The `ConflictException` thrown when an email already exists under a different provider says "Please sign in using the method you originally used" — it does not name the provider, to avoid information leakage.

---

## Endpoints

All endpoints below are `JwtAuthGuard`-protected.

| Method | Route | Description |
|---|---|---|
| `GET` | `/auth/me` | Returns `{ userId, email, name, hasPassword, createdAt }` from DB |
| `PATCH` | `/auth/profile` | Update display name |
| `PATCH` | `/auth/password` | Change password (gated on `hasPassword`) |
| `GET` | `/auth/providers` | List linked providers `{ provider, linkedAt }[]` |
| `GET` | `/auth/link/:provider` | Returns `{ url }` for OAuth link flow |
| `GET` | `/auth/link/callback/:provider` | OAuth callback — links provider to current user |
| `DELETE` | `/auth/providers/:provider` | Unlink a provider |
| `DELETE` | `/auth/profile` | Delete account (cascades to LinkedProvider) |

---

## Implementation Checklist

### Database
- [x] Add `name String?` and `password String?` to `User` in `schema.prisma`
- [x] Add `LinkedProvider` model to `schema.prisma`
- [x] Write migration with backfill (`provider`/`providerId` → `LinkedProvider`)
- [x] Remove `primaryProvider` (migration `20260526000001_remove_primary_provider`)

### Backend
- [x] `update-profile.dto.ts`
- [x] `change-password.dto.ts`
- [x] `UsersService.getById()`
- [x] `UsersService.getByProvider()` — queries `LinkedProvider`
- [x] `UsersService.createLocalUser()` — creates `LinkedProvider` record
- [x] `UsersService.create()` — creates `LinkedProvider` record
- [x] `UsersService.updateProfile()`
- [x] `UsersService.updatePassword()`
- [x] `UsersService.linkProvider()`
- [x] `UsersService.unlinkProvider()`
- [x] `UsersService.getLinkedProviders()`
- [x] `UsersService.deleteUser()`
- [x] All endpoints (see table above)
- [x] JWT payload includes `name` and `hasPassword`
- [x] `GET /auth/me` fetches from DB (returns `createdAt`)
- [x] `getOrThrow` for `JWT_SECRET` — no silent fallback to weak default
- [x] Unit tests — `users.service.spec.ts` (19 cases)
- [x] Unit tests — `auth.service.spec.ts` (20 cases)
- [x] Unit tests — `auth.controller.spec.ts` (21 cases)

### Frontend
- [x] Profile link in dashboard header
- [x] `dashboard/profile/page.tsx` — Account Info (email, member since)
- [x] `dashboard/profile/page.tsx` — Display Name (empty validation, clear message on type)
- [x] `dashboard/profile/page.tsx` — Change Password (confirm field, show/hide toggle, clear message on type)
- [x] `dashboard/profile/page.tsx` — Connected Accounts (connect/disconnect)
- [x] `dashboard/profile/page.tsx` — Danger Zone + email-confirmation modal
- [x] URL param banners (`?linked=`, `?error=provider_taken`, etc.)
- [x] Unit tests — `ProfilePage.test.tsx` (16 cases)

### Pending
- [x] E2E tests — guard enforcement (401 on unauthenticated requests); see `api/test/auth.e2e-spec.ts`
- [ ] Production OAuth credentials (Google Cloud Console, Facebook Developer, X Developer Portal)

---

## Out of Scope

- Avatar / profile photo (requires file storage)
- Email change (requires re-verification flow)
- Admin panel / user list
