export const INVITE_TEXT_FIELDS = [
  'inviteSubject',
  'inviteHeading',
  'inviteTagline',
  'inviteGreeting',
  'inviteMessage',
  'inviteButtonText',
  'inviteSignoff',
] as const;

export const INVITE_COLOR_FIELDS = [
  'inviteBackgroundColor',
  'inviteTextColor',
  'inviteAccentColor',
  'inviteMutedColor',
  'inviteButtonTextColor',
] as const;

export const INVITE_FIELDS = [...INVITE_TEXT_FIELDS, ...INVITE_COLOR_FIELDS] as const;

export type InviteField = (typeof INVITE_FIELDS)[number];
/** Prisma `select` for all invite template columns on WeddingSettings. */
export const INVITE_SELECT = Object.fromEntries(INVITE_FIELDS.map(f => [f, true])) as Record<InviteField, true>;
export type InviteTemplate = Record<InviteField, string>;
/** Saved overrides; null or '' means "use the default". */
export type InviteOverrides = Partial<Record<InviteField, string | null>>;

export const INVITE_DEFAULTS: InviteTemplate = {
  inviteSubject: "You're invited! — {coupleA} & {coupleB}'s Wedding",
  inviteHeading: '{coupleA} & {coupleB}',
  inviteTagline: 'request the pleasure of your company',
  inviteGreeting: 'Dear {guestName},',
  inviteMessage: 'We are delighted to invite you to celebrate our wedding day with us. Please join us on {weddingDate}.',
  inviteButtonText: 'RSVP Here',
  inviteSignoff: 'With love, {coupleA} & {coupleB}',
  inviteBackgroundColor: '#ffffff',
  inviteTextColor: '#333333',
  inviteAccentColor: '#5a4a3a',
  inviteMutedColor: '#8a7a6a',
  inviteButtonTextColor: '#ffffff',
};

export const INVITE_PLACEHOLDERS = ['{guestName}', '{coupleA}', '{coupleB}', '{weddingDate}'] as const;

export interface InviteData {
  guestName: string;
  rsvpLink: string;
  weddingDate?: Date | null;
  coupleNameA?: string | null;
  coupleNameB?: string | null;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const COLOR_FIELDS: readonly string[] = INVITE_COLOR_FIELDS;

export function resolveTemplate(overrides: InviteOverrides | null | undefined): InviteTemplate {
  const resolved = { ...INVITE_DEFAULTS };
  for (const field of INVITE_FIELDS) {
    const value = overrides?.[field];
    if (!value) continue;
    // Colors are interpolated into inline CSS, so anything that isn't a hex color falls back to the default.
    if (COLOR_FIELDS.includes(field) && !HEX_COLOR.test(value)) continue;
    resolved[field] = value;
  }
  return resolved;
}

function formatWeddingDate(date: Date | null | undefined): string {
  if (!date) return 'a date to be announced';
  return new Date(date).toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  });
}

function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\{(guestName|coupleA|coupleB|weddingDate)\}/g, (_, key: string) => values[key]);
}

/** Renders the invitation. Used for both sending and the admin preview so they always match. */
export function renderInvitation(
  overrides: InviteOverrides | null | undefined,
  data: InviteData,
): { subject: string; html: string } {
  const t = resolveTemplate(overrides);
  const plain = {
    guestName: data.guestName,
    coupleA: data.coupleNameA || 'Caleb',
    coupleB: data.coupleNameB || 'Raissa',
    weddingDate: formatWeddingDate(data.weddingDate),
  };
  const safe = Object.fromEntries(Object.entries(plain).map(([k, v]) => [k, escapeHtml(v)]));
  const text = (field: (typeof INVITE_TEXT_FIELDS)[number]) => fill(escapeHtml(t[field]), safe);

  const message = text('inviteMessage')
    .split(/\n\s*\n/)
    .map(p => `<p style="font-size: 16px; line-height: 1.7; margin: 0 0 16px;">${p.trim().replace(/\n/g, '<br />')}</p>`)
    .join('\n          ');
  const link = escapeHtml(data.rsvpLink);

  const html = `
    <div style="background-color: ${t.inviteBackgroundColor}; padding: 24px 0;">
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: ${t.inviteTextColor};">
        <h1 style="text-align: center; font-size: 28px; font-weight: normal; color: ${t.inviteAccentColor}; margin: 0 0 8px;">${text('inviteHeading')}</h1>
        <p style="text-align: center; color: ${t.inviteMutedColor}; font-size: 14px; margin: 0 0 32px;">${text('inviteTagline')}</p>

        <p style="font-size: 16px; margin: 0 0 16px;">${text('inviteGreeting')}</p>
          ${message}

        <div style="text-align: center; margin: 40px 0;">
          <a href="${link}"
             style="background-color: ${t.inviteAccentColor}; color: ${t.inviteButtonTextColor}; padding: 14px 32px; text-decoration: none; border-radius: 4px; font-size: 15px; display: inline-block; letter-spacing: 0.05em;">
            ${text('inviteButtonText')}
          </a>
        </div>

        <p style="font-size: 13px; color: ${t.inviteMutedColor}; text-align: center; margin: 0;">
          Or copy this link: <a href="${link}" style="color: ${t.inviteAccentColor};">${link}</a>
        </p>

        <hr style="border: none; border-top: 1px solid ${t.inviteMutedColor}; opacity: 0.3; margin: 32px 0;" />
        <p style="font-size: 12px; color: ${t.inviteMutedColor}; text-align: center; margin: 0;">${text('inviteSignoff')}</p>
      </div>
    </div>
  `;

  return { subject: fill(t.inviteSubject, plain), html };
}
