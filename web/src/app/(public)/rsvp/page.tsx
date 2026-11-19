import RsvpEntryPage from '@/components/public/RsvpEntryPage';
import { publicApi } from '@/lib/api';
import { weddingDetails } from '@/lib/weddingDetails';

export default async function RsvpPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const [settings, events] = await Promise.all([
    publicApi.getSettings().catch(() => null),
    publicApi.getEvents().catch(() => []),
  ]);

  return (
    <RsvpEntryPage
      initialCode={code ?? ''}
      coupleNames={settings ? `${settings.coupleNameA} & ${settings.coupleNameB}` : undefined}
      heading={settings?.rsvpHeading?.trim() || undefined}
      tagline={settings?.rsvpTagline ?? undefined}
      subtext={settings?.rsvpSubtext ?? undefined}
      details={weddingDetails(settings, events)}
    />
  );
}
