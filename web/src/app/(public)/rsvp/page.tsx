import RsvpEntryPage from '@/components/public/RsvpEntryPage';
import { publicApi } from '@/lib/api';

export default async function RsvpPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const settings = await publicApi.getSettings().catch(() => null);

  return (
    <RsvpEntryPage
      initialCode={code ?? ''}
      coupleNames={settings ? `${settings.coupleNameA} & ${settings.coupleNameB}` : undefined}
      tagline={settings?.rsvpTagline ?? undefined}
      subtext={settings?.rsvpSubtext ?? undefined}
    />
  );
}
