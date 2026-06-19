import FloatingNav from '@/components/public/FloatingNav';
import DesktopTopNav from '@/components/public/DesktopTopNav';
import { publicApi } from '@/lib/api';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await publicApi.getSettings().catch(() => null);
  const coupleNames = settings
    ? `${settings.coupleNameA} & ${settings.coupleNameB}`
    : 'Caleb & Raissa';
  const monogramUrl = settings?.monogramUrl ?? '/images/rc-monogram-floral-green.png';

  return (
    <div className="min-h-screen flex flex-col">
      <DesktopTopNav monogramUrl={monogramUrl} />
      <FloatingNav coupleNames={coupleNames} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
