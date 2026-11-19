import { siteFonts, type FontSettings } from '@/lib/fonts';

/** Loads the fonts chosen in Dashboard → Settings (Google Fonts stylesheets and uploaded font files). */
export default function SiteFonts({ settings }: { settings: FontSettings | null | undefined }) {
  const { stylesheets, fontFaceCss } = siteFonts(settings);
  return (
    <>
      {stylesheets.map(href => <link key={href} rel="stylesheet" href={href} precedence="default" />)}
      {fontFaceCss && <style data-site-fonts dangerouslySetInnerHTML={{ __html: fontFaceCss }} />}
    </>
  );
}

/** CSS variables for the chosen fonts, plus body text that follows the chosen body font. */
export function siteFontStyle(settings: FontSettings | null | undefined): Record<string, string> {
  const { vars } = siteFonts(settings);
  return vars['--font-sans'] ? { ...vars, fontFamily: 'var(--font-sans)' } : vars;
}
