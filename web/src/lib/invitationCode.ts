// Remembers a guest's invitation code on their device once it has worked, so the RSVP and
// photo-sharing pages can fill it in next time. Storage can be unavailable (private mode);
// then nothing is remembered and the pages work as before.

const KEY = 'invitation_code';

export function rememberInvitationCode(code: string) {
  try {
    if (code.trim()) localStorage.setItem(KEY, code.trim().toUpperCase());
  } catch {}
}

export function getRememberedInvitationCode(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

/** Forgets the code if it's the one remembered (e.g. it no longer works). */
export function forgetInvitationCode(code?: string) {
  try {
    if (!code || localStorage.getItem(KEY) === code.trim().toUpperCase()) localStorage.removeItem(KEY);
  } catch {}
}
