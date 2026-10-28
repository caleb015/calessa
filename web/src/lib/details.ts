import type { CalendarInfo } from '@/types/api';

const TZ = 'Asia/Manila';

/** "12 February 2027" — the /details page date style. */
export function formatDetailsDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
}

/** "4:30 PM" in Manila time. */
export function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
}

const googleStamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Pre-filled "create event" link for Google Calendar. */
export function googleCalendarUrl(info: CalendarInfo): string {
  const dates = info.allDay
    ? `${info.start.replace(/-/g, '')}/${info.end.replace(/-/g, '')}`
    : `${googleStamp(info.start)}/${googleStamp(info.end)}`;
  const params = new URLSearchParams({ action: 'TEMPLATE', text: info.title, dates, details: info.description });
  if (info.location) params.set('location', info.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
