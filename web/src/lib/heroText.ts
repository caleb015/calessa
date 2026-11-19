// Where the names, date and RSVP button sit on the homepage's hero photo (Dashboard → Settings → Homepage).

export type HeroTextAlign = 'left' | 'center' | 'right' | 'justify';

export const HERO_TEXT_ALIGNS: { value: HeroTextAlign; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Centre (default)' },
  { value: 'right', label: 'Right' },
  { value: 'justify', label: 'Justify' },
];

/** Same rule as the API: pixels or a percentage, e.g. "120px", "-10%" (a plain number is pixels). */
export const HERO_TEXT_OFFSET = /^-?\d{1,4}(\.\d{1,2})?(px|%)?$/;

/** A usable offset as a CSS length ("80" becomes "80px"), or null for none or anything unusable. */
function cssOffset(value: string | null | undefined): string | null {
  const raw = value?.trim() ?? '';
  if (!raw || !HERO_TEXT_OFFSET.test(raw) || parseFloat(raw) === 0) return null;
  return /(px|%)$/.test(raw) ? raw : `${raw}px`;
}

/** A vertical offset (positive = up, like the photo's own) as CSS `top`, or null for none. */
function cssTop(value: string | null | undefined): string | null {
  const up = cssOffset(value);
  return up && (up.startsWith('-') ? up.slice(1) : `-${up}`);
}

/**
 * The text's alignment, its sideways shift (positive = right) and its vertical shift as CSS `top`, for
 * computers and for phones (which follow the computer one unless they have their own), falling back to
 * the defaults.
 */
export function heroTextPlacement(
  settings: {
    heroTextAlign?: string | null; heroTextOffset?: string | null; heroTextOffsetY?: string | null; heroMobileTextOffsetY?: string | null;
  } | null | undefined,
) {
  const align = HERO_TEXT_ALIGNS.some(a => a.value === settings?.heroTextAlign) ? (settings!.heroTextAlign as HeroTextAlign) : 'center';
  const offsetY = cssTop(settings?.heroTextOffsetY);
  const phoneSet = (settings?.heroMobileTextOffsetY?.trim() ?? '') !== '' && HERO_TEXT_OFFSET.test(settings!.heroMobileTextOffsetY!.trim());
  return {
    align,
    offset: cssOffset(settings?.heroTextOffset),
    offsetY,
    phoneOffsetY: phoneSet ? cssTop(settings?.heroMobileTextOffsetY) : offsetY,
  };
}

/**
 * Tailwind classes for each alignment: how the lines line up within the text block (as wide as its longest
 * line). The block itself stays centred on the photo; the offset is what moves it.
 */
export const HERO_ALIGN_CLASSES: Record<HeroTextAlign, { items: string; text: string }> = {
  left: { items: 'items-start', text: 'text-left' },
  center: { items: 'items-center', text: 'text-center' },
  right: { items: 'items-end', text: 'text-right' },
  // Every line runs edge to edge where it can (the date spreads out, the button widens); single words start at the left.
  justify: { items: 'items-stretch', text: 'text-justify [text-align-last:justify]' },
};
