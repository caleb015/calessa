import FloatingNav from '@/components/public/FloatingNav';
import { publicApi } from '@/lib/api';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await publicApi.getSettings().catch(() => null);
  const coupleNames = settings
    ? `${settings.coupleNameA} & ${settings.coupleNameB}`
    : 'Caleb & Raissa';

  return (
    <div className="min-h-screen flex flex-col">
      <FloatingNav coupleNames={coupleNames} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
