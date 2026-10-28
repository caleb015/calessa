import FloatingNav from '@/components/public/FloatingNav';
import DesktopTopNav from '@/components/public/DesktopTopNav';
import Link from 'next/link';
import Maintenance from '@/components/public/Maintenance';
import { publicApi } from '@/lib/api';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await publicApi.getSettings().catch(() => null);
  const coupleNames = settings
    ? `${settings.coupleNameA} & ${settings.coupleNameB}`
    : 'Caleb & Raissa';
  const monogramUrl = settings?.monogramUrl ?? '/images/rc-monogram-floral-green.png';

  // Only override variables the admin has actually set — anything unset falls
  // back to the defaults in globals.css via normal CSS variable inheritance.
  const themeVars: Record<string, string> = {};
  if (settings?.themeBackground) themeVars['--background'] = settings.themeBackground;
  if (settings?.themeForeground) themeVars['--foreground'] = settings.themeForeground;
  if (settings?.themeMuted) themeVars['--muted'] = settings.themeMuted;
  if (settings?.themeAccent) themeVars['--accent'] = settings.themeAccent;
  if (settings?.themeBorder) themeVars['--border'] = settings.themeBorder;
  if (settings?.themeSurface) themeVars['--surface'] = settings.themeSurface;
  if (settings?.themeInverseBackground) themeVars['--inverse-background'] = settings.themeInverseBackground;
  if (settings?.themeOverlayText) themeVars['--overlay-text'] = settings.themeOverlayText;
  if (settings?.themeOverlayScrim) themeVars['--overlay-scrim'] = settings.themeOverlayScrim;

  // Site switched off: visitors get the maintenance page; admins previewing see the site with a banner.
  const hidden = settings?.isPublic === false;
  if (hidden && !settings?.preview) {
    return (
      <div style={themeVars as React.CSSProperties}>
        <Maintenance coupleNames={coupleNames} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={themeVars as React.CSSProperties}>
      {hidden && (
        <div className="bg-amber-100 text-amber-900 text-xs text-center px-4 py-2">
          Preview: the site is not public, so visitors see the Under Maintenance page.{' '}
          <Link href="/dashboard" target="_top" className="underline">Back to dashboard</Link>
        </div>
      )}
      <DesktopTopNav monogramUrl={monogramUrl} />
      <FloatingNav coupleNames={coupleNames} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
