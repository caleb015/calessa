import { FiMapPin } from 'react-icons/fi';
import type { WeddingDetails } from '@/lib/weddingDetails';

const mapLinkProps = { target: '_blank', rel: 'noopener noreferrer' } as const;

/**
 * When and where the wedding is, on the RSVP pages.
 * - `line`: the date, then (smaller) the place, under the RSVP heading.
 * - `panel`: "When" and "Where" side by side (stacked on phones), above the RSVP form.
 */
export default function WeddingAtAGlance({ details, variant }: { details: WeddingDetails; variant: 'line' | 'panel' }) {
  const { date, time, venue, address, mapUrl } = details;

  if (variant === 'line') {
    const place = venue ?? address;
    const placeCls = 'inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.25em] text-[var(--foreground)]/80';
    return (
      <div className="flex flex-col items-center gap-1.5">
        {date && <p className="font-serif text-xl md:text-2xl text-[var(--foreground)]">{date}</p>}
        {place && (mapUrl ? (
          <a href={mapUrl} {...mapLinkProps} className={`${placeCls} hover:text-[var(--accent)] transition-colors`}>
            <FiMapPin aria-hidden size={11} className="shrink-0 text-[var(--accent)]" />
            <span className="underline decoration-[var(--foreground)]/25 underline-offset-4">{place}</span>
            <span className="sr-only"> (opens map in a new tab)</span>
          </a>
        ) : (
          <p className={placeCls}>
            <FiMapPin aria-hidden size={11} className="shrink-0 text-[var(--accent)]" />{place}
          </p>
        ))}
      </div>
    );
  }

  const hasWhen = !!(date || time);
  const hasWhere = !!(venue || address);
  return (
    <section
      aria-label="Wedding date and location"
      className={`grid gap-px bg-[var(--border)] border border-[var(--border)] ${hasWhen && hasWhere ? 'sm:grid-cols-2' : ''}`}
    >
      {hasWhen && (
        <div className="bg-[var(--background)]/90 backdrop-blur-sm px-6 py-5 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--muted)] mb-2">When</p>
          {date && <p className="font-serif text-lg leading-snug whitespace-nowrap">{date}</p>}
          {time && <p className="text-sm text-[var(--muted)] mt-1">{time}</p>}
        </div>
      )}
      {hasWhere && (
        <div className="bg-[var(--background)]/90 backdrop-blur-sm px-6 py-5 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--muted)] mb-2">Where</p>
          {venue && <p className="font-serif text-lg leading-snug">{venue}</p>}
          {address && <p className="text-sm text-[var(--muted)] mt-1">{address}</p>}
          {mapUrl && (
            <a
              href={mapUrl}
              {...mapLinkProps}
              className="inline-flex items-center gap-1 mt-2 text-[10px] uppercase tracking-[0.25em] text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
            >
              <FiMapPin aria-hidden size={11} />
              <span className="border-b border-current pb-0.5">Open map</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      )}
    </section>
  );
}
