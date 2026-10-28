// Builds the "Add to Calendar" data for the wedding day and renders it as an iCalendar (.ics) file.

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000; // Asia/Manila is fixed UTC+8, no DST
const HOUR_MS = 60 * 60 * 1000;

export interface CalendarEventInput {
  startTime: Date | null;
  endTime: Date | null;
  venueName: string | null;
}

export interface CalendarInfo {
  title: string;
  location: string | null;
  description: string;
  allDay: boolean;
  /** ISO timestamps for timed events; YYYY-MM-DD (Manila date) for all-day. */
  start: string;
  /** Exclusive end: ISO timestamp, or the day after for all-day. */
  end: string;
}

function manilaDate(d: Date): string {
  return new Date(d.getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}

function nextDay(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Spans the first event's start to the last event's end (an event without an end counts as one hour).
 * Falls back to an all-day entry on the wedding date when no event has a time. Null if neither exists.
 */
export function buildCalendarInfo(input: {
  events: CalendarEventInput[];
  weddingDate: Date | null;
  coupleNameA: string;
  coupleNameB: string;
  location: string | null;
  detailsUrl: string;
}): CalendarInfo | null {
  const timed = input.events.filter(e => e.startTime);
  const title = `${input.coupleNameA} & ${input.coupleNameB}'s Wedding`;
  const location = input.location || timed[0]?.venueName || null;
  const description = `Details: ${input.detailsUrl}`;

  if (timed.length > 0) {
    const start = Math.min(...timed.map(e => e.startTime!.getTime()));
    const end = Math.max(...timed.map(e => (e.endTime ?? new Date(e.startTime!.getTime() + HOUR_MS)).getTime()));
    return { title, location, description, allDay: false, start: new Date(start).toISOString(), end: new Date(end).toISOString() };
  }
  if (input.weddingDate) {
    const day = manilaDate(input.weddingDate);
    return { title, location, description, allDay: true, start: day, end: nextDay(day) };
  }
  return null;
}

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** RFC 5545 line folding: lines longer than 75 octets continue on the next line after a space. */
function fold(line: string): string {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (Buffer.byteLength(current + char, 'utf8') > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join('\r\n ');
}

const icsTimestamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsDate = (ymd: string) => ymd.replace(/-/g, '');

export function renderIcs(info: CalendarInfo, uidDomain: string, now: Date = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Calessa//Wedding//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:wedding@${uidDomain}`,
    `DTSTAMP:${icsTimestamp(now.toISOString())}`,
    info.allDay ? `DTSTART;VALUE=DATE:${icsDate(info.start)}` : `DTSTART:${icsTimestamp(info.start)}`,
    info.allDay ? `DTEND;VALUE=DATE:${icsDate(info.end)}` : `DTEND:${icsTimestamp(info.end)}`,
    `SUMMARY:${escapeText(info.title)}`,
    ...(info.location ? [`LOCATION:${escapeText(info.location)}`] : []),
    `DESCRIPTION:${escapeText(info.description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
