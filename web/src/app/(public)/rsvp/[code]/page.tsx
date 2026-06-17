import { redirect } from 'next/navigation';
import { publicApi } from '@/lib/api';
import RsvpInvitationView from '@/components/public/RsvpInvitationView';

export default async function RsvpCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const [guest, settings] = await Promise.all([
    publicApi.getRsvpByCode(code).catch(() => null),
    publicApi.getSettings().catch(() => null),
  ]);

  // No RSVP yet — send them to the Odie entry page with the code pre-filled
  if (guest && !guest.rsvp) {
    redirect(`/rsvp?code=${encodeURIComponent(code)}`);
  }

  // Already RSVP'd, not found, or RSVP closed — show form/state directly
  return <RsvpInvitationView code={code} guest={guest} settings={settings} />;
}
