import { clearPreviewCookie } from '@/lib/preview';

// Admin session handling: if the login token is missing, expired or rejected by the API,
// clear it and send the user to /login (then back to where they were after signing in).

export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please log in again.';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

/** True when the JWT's `exp` has passed. Unreadable tokens are left for the API to judge. */
export function isTokenExpired(token: string, now = Date.now()): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 <= now;
  } catch {
    return false;
  }
}

/** Only internal dashboard paths are allowed as the post-login destination. */
export function safeNextPath(next: string | null | undefined): string {
  return next && next.startsWith('/dashboard') && !next.startsWith('//') ? next : '/dashboard';
}

let ending = false;

/** Full page navigation (replaceable in tests, where jsdom can't navigate). */
export const navigation = {
  assign: (url: string) => window.location.assign(url),
};

/** Clears the session and goes to the login page, remembering the current dashboard page. */
export function endSession() {
  if (typeof window === 'undefined' || ending) return;
  ending = true;
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_email');
  document.cookie = 'logged_in=; Max-Age=0; path=/';
  clearPreviewCookie();
  const here = window.location.pathname + window.location.search;
  navigation.assign(`/login?expired=1&next=${encodeURIComponent(safeNextPath(here))}`);
}

export class SessionExpiredError extends Error {
  constructor() {
    super(SESSION_EXPIRED_MESSAGE);
  }
}

/**
 * fetch() for logged-in requests: adds the token, and ends the session (redirect to /login)
 * when there is no valid token or the API answers 401.
 */
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  if (!token || isTokenExpired(token)) {
    endSession();
    throw new SessionExpiredError();
  }
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
  });
  if (res.status === 401) {
    endSession();
    throw new SessionExpiredError();
  }
  return res;
}

/** Test helper: allow endSession to run again. */
export function resetSessionStateForTests() {
  ending = false;
}
