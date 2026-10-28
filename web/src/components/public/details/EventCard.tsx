import type { WeddingEvent } from '@/types/api';
import { formatEventTime } from '@/lib/details';

export default function EventCard({ event }: { event: WeddingEvent }) {
  const meta = [event.startTime && formatEventTime(event.startTime), event.venueName].filter(Boolean).join('  |  ');
  return (
    <div className="p-6 md:p-7 border border-[var(--border)] bg-white flex flex-col">
      {event.tagline && <p className="text-xs uppercase tracking-[0.12em] text-[var(--accent)] mb-2">{event.tagline}</p>}
      <h2 className="font-serif text-2xl md:text-3xl mb-3">{event.title}</h2>
      {meta && <p className="text-sm font-semibold text-[var(--muted)] whitespace-pre">{meta}</p>}
      {event.mapUrl && (
        <a
          href={event.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 self-end text-sm text-[var(--accent)] underline underline-offset-4"
        >
          View on map →
        </a>
      )}
    </div>
  );
}
