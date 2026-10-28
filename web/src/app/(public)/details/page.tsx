import { publicApi } from '@/lib/api';
import type { DetailsPageContent } from '@/types/api';
import DetailsHeader from '@/components/public/details/DetailsHeader';
import EventCard from '@/components/public/details/EventCard';
import DressCode from '@/components/public/details/DressCode';
import DetailsCta from '@/components/public/details/DetailsCta';

// Used if the details-page content can't be loaded, so the page still renders sensibly.
const FALLBACK: DetailsPageContent = {
  header: { eyebrow: 'The Wedding', title: 'Details', location: null },
  calendar: null,
  cta: null,
  dressCode: null,
};

export default async function DetailsPage() {
  const [events, settings, content] = await Promise.all([
    publicApi.getEvents().catch(() => []),
    publicApi.getSettings().catch(() => null),
    publicApi.getDetailsPage().catch(() => FALLBACK),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <DetailsHeader
        header={content.header}
        calendar={content.calendar}
        weddingDate={settings?.weddingDate ?? null}
        icsUrl={publicApi.calendarIcsUrl}
      />

      {events.length === 0 ? (
        <p className="text-center text-[var(--muted)]">Details will be announced soon.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {events.map(event => <EventCard key={event.id} event={event} />)}
        </div>
      )}

      {content.dressCode && (
        <div className="mt-8">
          <DressCode dressCode={content.dressCode} />
        </div>
      )}

      {content.cta && <DetailsCta cta={content.cta} />}
    </div>
  );
}
