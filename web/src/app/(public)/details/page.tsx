import { publicApi } from '@/lib/api';
import type { WeddingEvent } from '@/types/api';

function EventCard({ event }: { event: WeddingEvent }) {
  return (
    <div className="p-8 border border-[var(--border)] bg-white">
      <p className="text-xs text-[var(--accent)] uppercase tracking-widest mb-2">{event.type}</p>
      <h2 className="font-serif text-2xl mb-4">{event.title}</h2>
      {event.venueName && <p className="font-medium text-[var(--foreground)]">{event.venueName}</p>}
      {event.address && <p className="text-[var(--muted)] text-sm mt-1">{event.address}</p>}
      {(event.startTime || event.endTime) && (
        <p className="text-[var(--muted)] text-sm mt-3">
          {event.startTime && new Date(event.startTime).toLocaleString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit',
          })}
          {event.endTime && ` – ${new Date(event.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
        </p>
      )}
      {event.notes && <p className="text-[var(--muted)] text-sm mt-3 italic">{event.notes}</p>}
      {event.mapUrl && (
        <a
          href={event.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 text-sm text-[var(--accent)] underline underline-offset-4"
        >
          View on map →
        </a>
      )}
    </div>
  );
}

export default async function DetailsPage() {
  const events = await publicApi.getEvents().catch(() => []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)] mb-3">Wedding Details</p>
        <h1 className="text-4xl md:text-5xl font-serif">Join Us</h1>
      </div>

      {events.length === 0 && (
        <p className="text-center text-[var(--muted)]">Details will be announced soon.</p>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {events.map(event => <EventCard key={event.id} event={event} />)}
      </div>
    </div>
  );
}
