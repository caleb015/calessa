import type { WeddingEvent, WeddingSettings } from '@/types/api';

/** When and where the wedding is, ready to show (everything is optional). */
export interface WeddingDetails {
  /** e.g. "February 12, 2027" */
  date: string | null;
  /** e.g. "4:00 PM" (from the main event's start time) */
  time: string | null;
  venue: string | null;
  address: string | null;
  /** Only real web links are kept. */
  mapUrl: string | null;
}

const ZONE = 'Asia/Manila';

/**
 * The main event is the one shown on the homepage ("The Celebration"); without one, the first event.
 * The date comes from the wedding date in Settings, or else that event's start.
 */
export function weddingDetails(settings: Pick<WeddingSettings, 'weddingDate'> | null, events: WeddingEvent[]): WeddingDetails | null {
  const sorted = [...events].sort((a, b) => a.displayOrder - b.displayOrder || (a.startTime ?? '').localeCompare(b.startTime ?? ''));
  const main = sorted.find(e => e.showOnHomepage) ?? sorted[0] ?? null;
  const when = settings?.weddingDate ?? main?.startTime ?? null;
  const text = (s: string | null | undefined) => s?.trim() || null;

  const details: WeddingDetails = {
    date: when ? new Date(when).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: ZONE }) : null,
    time: main?.startTime ? new Date(main.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: ZONE }) : null,
    venue: text(main?.venueName),
    address: text(main?.address),
    mapUrl: main?.mapUrl && /^https?:\/\//i.test(main.mapUrl) ? main.mapUrl : null,
  };
  return details.date || details.venue || details.address ? details : null;
}
