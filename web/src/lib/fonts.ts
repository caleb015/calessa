// The public site's fonts. Each role (headings, body text, handwritten accent) uses its default font
// unless one is chosen in Dashboard → Settings: either a Google Fonts family, or an uploaded font file.

export type FontRoleKey = 'heading' | 'body' | 'accent';

export interface FontRole {
  key: FontRoleKey;
  label: string;
  /** Where visitors see it. */
  usedFor: string;
  /** Settings fields: the font's name, and (for uploads) the file's link. */
  nameField: 'fontHeading' | 'fontBody' | 'fontAccent';
  urlField: 'fontHeadingUrl' | 'fontBodyUrl' | 'fontAccentUrl';
  /** The CSS variable the site's styles read for this role. */
  cssVar: '--font-serif' | '--font-sans' | '--font-accent';
  /** Fallbacks while the font loads, or if it can't. */
  fallback: string;
  defaultName: string;
  /** Sample text for the preview. */
  sample: string;
  /** Google Fonts that suit this role (any other Google Fonts name can be typed in too). */
  suggestions: string[];
}

export const FONT_ROLES: FontRole[] = [
  {
    key: 'heading', label: 'Headings', usedFor: 'Your names, page titles and section headings',
    nameField: 'fontHeading', urlField: 'fontHeadingUrl', cssVar: '--font-serif', fallback: 'Georgia, serif',
    defaultName: 'Playfair Display', sample: 'Raissa & Caleb',
    suggestions: ['Playfair Display', 'Cormorant Garamond', 'Lora', 'Libre Baskerville', 'EB Garamond', 'Cinzel', 'Marcellus', 'Bodoni Moda', 'DM Serif Display', 'Prata', 'Gilda Display', 'Italiana'],
  },
  {
    key: 'body', label: 'Body text', usedFor: 'Everything else: paragraphs, menus, buttons and forms',
    nameField: 'fontBody', urlField: 'fontBodyUrl', cssVar: '--font-sans', fallback: 'Arial, sans-serif',
    defaultName: 'Geist', sample: 'Join us as we celebrate our wedding day.',
    suggestions: ['Geist', 'Jost', 'Montserrat', 'Lato', 'Raleway', 'Work Sans', 'Nunito Sans', 'Karla', 'Josefin Sans', 'Quicksand', 'Mulish', 'Source Sans 3'],
  },
  {
    key: 'accent', label: 'Handwritten accent', usedFor: 'The handwritten line in the RSVP page’s invitation code box',
    nameField: 'fontAccent', urlField: 'fontAccentUrl', cssVar: '--font-accent', fallback: 'cursive',
    defaultName: 'Slopes', sample: 'My Hoomans are tying the knot!!',
    suggestions: ['Great Vibes', 'Dancing Script', 'Parisienne', 'Allura', 'Sacramento', 'Alex Brush', 'Pinyon Script', 'Caveat', 'Homemade Apple', 'Satisfy'],
  },
];

/** Same rules as the API: safe to place in CSS as-is. */
export const FONT_NAME = /^[A-Za-z0-9][A-Za-z0-9 -]{0,59}$/;
export const FONT_URL = /^https:\/\/[^\s"'()<>]+\.(woff2|woff|ttf|otf)$/i;

const FORMATS: Record<string, string> = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' };

/**
 * A Google Fonts stylesheet for one family, with the regular, medium, semibold and bold weights and
 * italic (Google sends whichever of these the font has). One family per link, so a misspelled name
 * only affects its own role.
 */
export function googleFontUrl(name: string): string {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap`;
}

/** The name an uploaded font is registered under on the page (kept apart from Google Fonts names). */
export const uploadedFaceName = (role: FontRoleKey) => `Calessa ${role[0].toUpperCase()}${role.slice(1)}`;

export type FontSettings = Partial<Record<FontRole['nameField'] | FontRole['urlField'], string | null>>;

/** How one role is set: the default, a Google font, or an uploaded file. */
export function fontChoice(settings: FontSettings | null | undefined, role: FontRole):
  { kind: 'default' } | { kind: 'google'; name: string } | { kind: 'upload'; name: string; url: string } {
  const name = settings?.[role.nameField]?.trim() ?? '';
  const url = settings?.[role.urlField]?.trim() ?? '';
  if (url && FONT_URL.test(url)) return { kind: 'upload', name: FONT_NAME.test(name) ? name : 'Uploaded font', url };
  if (name && FONT_NAME.test(name)) return { kind: 'google', name };
  return { kind: 'default' };
}

/** Everything the page needs to use the chosen fonts: stylesheets to load, uploaded font faces, and CSS variables. */
export function siteFonts(settings: FontSettings | null | undefined) {
  const stylesheets: string[] = [];
  const faces: string[] = [];
  const vars: Record<string, string> = {};
  for (const role of FONT_ROLES) {
    const choice = fontChoice(settings, role);
    if (choice.kind === 'default') continue;
    let family: string;
    if (choice.kind === 'google') {
      family = choice.name;
      stylesheets.push(googleFontUrl(choice.name));
    } else {
      family = uploadedFaceName(role.key);
      const ext = choice.url.split('.').pop()!.toLowerCase();
      faces.push(`@font-face{font-family:"${family}";src:url("${choice.url}") format("${FORMATS[ext]}");font-display:swap;}`);
    }
    vars[role.cssVar] = `"${family}", ${role.fallback}`;
  }
  return { stylesheets, fontFaceCss: faces.join('\n'), vars };
}
