import { FiCalendar, FiMapPin } from 'react-icons/fi';
import type { DetailsPageContent } from '@/types/api';
import { formatDetailsDate } from '@/lib/details';
import AddToCalendar from './AddToCalendar';

export default function DetailsHeader({
  header,
  calendar,
  weddingDate,
  icsUrl,
}: {
  header: DetailsPageContent['header'];
  calendar: DetailsPageContent['calendar'];
  weddingDate: string | null;
  icsUrl: string;
}) {
  return (
    <div className="text-center mb-12">
      <p className="text-sm uppercase tracking-[0.15em] text-[var(--muted)] mb-2">{header.eyebrow}</p>
      <h1 className="text-4xl md:text-5xl font-serif mb-6">{header.title}</h1>
      {(weddingDate || header.location) && (
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[var(--muted)] font-semibold">
          {weddingDate && (
            <span className="inline-flex items-center gap-2">
              <FiCalendar aria-hidden className="shrink-0" /> {formatDetailsDate(weddingDate)}
            </span>
          )}
          {header.location && (
            <span className="inline-flex items-center gap-2">
              <FiMapPin aria-hidden className="shrink-0" /> {header.location}
            </span>
          )}
        </div>
      )}
      {calendar && (
        <div className="mt-3">
          <AddToCalendar info={calendar} icsUrl={icsUrl} />
        </div>
      )}
    </div>
  );
}
