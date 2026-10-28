// Preview lets a logged-in admin view the public site while "Site is public" is off.
// The dashboard stores a short-lived preview token (issued by the API) in this cookie;
// public API calls forward it as a header, and the API skips the "not public" block.

export const PREVIEW_COOKIE = 'preview_token';
export const PREVIEW_HEADER = 'X-Preview-Token';
const MAX_AGE_SECONDS = 2 * 60 * 60; // matches the API token lifetime

export function setPreviewCookie(token: string) {
  document.cookie = `${PREVIEW_COOKIE}=${encodeURIComponent(token)}; Max-Age=${MAX_AGE_SECONDS}; path=/; SameSite=Lax`;
}

export function clearPreviewCookie() {
  document.cookie = `${PREVIEW_COOKIE}=; Max-Age=0; path=/`;
}

/** Reads the preview token from the request cookies (server) or document.cookie (browser). */
export async function getPreviewToken(): Promise<string | null> {
  if (typeof window !== 'undefined') {
    const match = document.cookie.match(new RegExp(`(?:^|; )${PREVIEW_COOKIE}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }
  try {
    const { cookies } = await import('next/headers');
    return (await cookies()).get(PREVIEW_COOKIE)?.value ?? null;
  } catch {
    return null; // outside a request (e.g. build time or tests)
  }
}
