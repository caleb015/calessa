# Phase 2: Google OAuth Implementation Plan

> **Status: Implemented (2026-05-26)**  
> Google, Facebook, and X OAuth are all working end-to-end. See divergence notes below before following the steps in this doc — the actual implementation used `passport-oauth2` (generic) rather than `passport-google-oauth20`.

## Goal
Replace the simulated OAuth stub with a real Google OAuth 2.0 flow using `passport-google-oauth20`, which is already installed. Once Google is working, Facebook/Twitter/X follow the same pattern.

## How the flow will work

```
User clicks "Continue with Google"
  → Frontend redirects to GET /auth/oauth/google
    → NestJS redirects to Google consent screen
      → Google redirects to GET /auth/callback/google?code=...
        → GoogleStrategy exchanges code for profile
          → AuthService finds or creates User (provider=google)
            → JWT issued → redirect to frontend /auth/callback?token=...
              → Frontend stores token + sets logged_in cookie → /dashboard
```

---

## 1. Google Cloud Console setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Authorized redirect URI: `http://localhost:3001/auth/callback/google`
4. Copy Client ID and Client Secret

---

## 2. Environment variables

File: `api/.env`

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/callback/google
FRONTEND_URL=http://localhost:3000
```

Also update `api/.env.example` with these keys (no values).

---

## 3. Backend: GoogleStrategy

New file: `api/src/auth/google.strategy.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService, private authService: AuthService) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID'),
      clientSecret: config.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.get('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback) {
    const email = profile.emails?.[0]?.value;
    const providerId = profile.id;
    const result = await this.authService.login({ email, provider: 'google', providerId });
    done(null, result);
  }
}
```

---

## 4. Backend: wire into AuthModule

File: `api/src/auth/auth.module.ts`

- Import `GoogleStrategy` and add to `providers` array alongside `LocalStrategy` and `JwtStrategy`

---

## 5. Backend: replace controller stubs

File: `api/src/auth/auth.controller.ts`

Replace the generic `oauth/:provider` and `callback/:provider` stubs with dedicated Google routes:

```typescript
@Get('oauth/google')
@UseGuards(AuthGuard('google'))
googleLogin() {
  // passport redirects to Google — no body needed
}

@Get('callback/google')
@UseGuards(AuthGuard('google'))
googleCallback(@Req() req, @Res() res: Response) {
  const { access_token } = req.user;
  const frontendUrl = this.configService.get('FRONTEND_URL');
  res.redirect(`${frontendUrl}/auth/callback?token=${access_token}`);
}
```

Inject `ConfigService` into the controller constructor.

Keep the existing stub routes for Facebook/Twitter/X until those are implemented.

---

## 6. Frontend: new callback page

New file: `web/src/app/auth/callback/page.tsx`

This page receives the token from the backend redirect, stores it, sets the cookie, and forwards to `/dashboard`.

```typescript
'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    if (!token) { router.push('/'); return; }
    localStorage.setItem('access_token', token);
    document.cookie = 'logged_in=true; path=/; SameSite=Lax';
    router.push('/dashboard');
  }, [router, params]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Signing you in...</p>
    </div>
  );
}
```

---

## 7. Frontend: update AuthProviderButtons

File: `web/src/components/AuthProviderButtons.tsx`

For the Google button, replace the fake callback fetch with a direct browser redirect to the backend:

```typescript
const handleGoogle = () => {
  window.location.href = `${appConfig.apiUrl}/auth/oauth/google`;
};
```

Leave Facebook/Twitter/X buttons as stubs (disabled or unchanged) until implemented.

---

## 8. Testing checklist (production credentials only)

These items apply when switching from the mock OAuth server to real provider credentials. They are not required for local dev (which uses `npm run mock:oauth`).

- [ ] `.env` has all four Google vars set (real credentials from Google Cloud Console)
- [ ] `http://localhost:3001/auth/callback/google` is in the Google Console redirect URIs
- [ ] Clicking "Continue with Google" opens Google consent screen
- [ ] After consent, browser lands on `/auth/callback?token=...`
- [ ] `/dashboard` loads and shows the Google account email
- [ ] Logout clears session and redirects to `/`
- [ ] Existing local email/password login still works

---

## Notes

- Token is passed as a URL query param — acceptable for localhost dev. For production, prefer a short-lived code exchanged server-side or an httpOnly cookie.
- Facebook requires HTTPS even for dev (use ngrok). Twitter/X requires app approval. Tackle those after Google is confirmed working.
- `passport-twitter` (v1) uses OAuth 1.0a; consider `passport-twitter-oauth2` for the newer flow when the time comes.

---

## Implementation Divergence (as-built)

The plan above describes using `passport-google-oauth20` (provider-specific). The actual implementation uses **`passport-oauth2`** (generic) for all three providers. This was a deliberate choice:

- All OAuth endpoint URLs (`authorizationURL`, `tokenURL`, `userInfoURL`) are env vars
- Swapping from mock server → real provider in prod requires only `.env` changes, no code changes
- The `validate()` method manually fetches userinfo using the access token, which works identically across all three providers

The `AuthProviderButtons` component was also changed from buttons with `onClick` handlers to **`<a>` anchor tags** with `href` attributes pointing directly to the backend OAuth routes. This avoids `window.location` assignment (which jsdom@26 makes untestable) and is semantically more correct for navigation links.

A **mock OAuth server** (`api/scripts/mock-oauth-server.ts`, using `oauth2-mock-server` on port 8080) was added for local dev. It serves per-provider mock profiles keyed by `client_id`, allowing all three OAuth buttons to be tested simultaneously without real credentials.
