import { buildCalendarInfo, renderIcs } from './calendar';

const base = {
  events: [],
  weddingDate: null,
  coupleNameA: 'Caleb',
  coupleNameB: 'Raissa',
  location: null,
  detailsUrl: 'https://raissaandcaleb.com/details',
};
const ev = (start: string | null, end: string | null = null, venueName: string | null = null) => ({
  startTime: start ? new Date(start) : null,
  endTime: end ? new Date(end) : null,
  venueName,
});

describe('buildCalendarInfo', () => {
  it('spans from the first event start to the last event end', () => {
    const info = buildCalendarInfo({
      ...base,
      events: [
        ev('2027-02-12T13:00:00.000Z', '2027-02-12T14:00:00.000Z', 'Pavo Villa'),
        ev('2027-02-12T08:30:00.000Z', '2027-02-12T13:00:00.000Z', 'Emerald Events Place'),
      ],
    });
    expect(info).toMatchObject({ allDay: false, start: '2027-02-12T08:30:00.000Z', end: '2027-02-12T14:00:00.000Z' });
  });

  it('counts an event without an end time as one hour', () => {
    const info = buildCalendarInfo({ ...base, events: [ev('2027-02-12T13:00:00.000Z')] });
    expect(info?.end).toBe('2027-02-12T14:00:00.000Z');
  });

  it('ignores events without a start time', () => {
    const info = buildCalendarInfo({ ...base, events: [ev(null, '2027-02-13T00:00:00.000Z'), ev('2027-02-12T08:30:00.000Z')] });
    expect(info?.start).toBe('2027-02-12T08:30:00.000Z');
    expect(info?.end).toBe('2027-02-12T09:30:00.000Z');
  });

  it('falls back to an all-day entry on the Manila wedding date', () => {
    // 2027-02-11T17:00Z is already Feb 12 in Manila
    const info = buildCalendarInfo({ ...base, weddingDate: new Date('2027-02-11T17:00:00.000Z') });
    expect(info).toMatchObject({ allDay: true, start: '2027-02-12', end: '2027-02-13' });
  });

  it('returns null when there is neither a time nor a date', () => {
    expect(buildCalendarInfo(base)).toBeNull();
  });

  it('uses the page location, else the first timed event venue', () => {
    const events = [ev('2027-02-12T08:30:00.000Z', null, 'Emerald Events Place')];
    expect(buildCalendarInfo({ ...base, events, location: 'Antipolo, Rizal' })?.location).toBe('Antipolo, Rizal');
    expect(buildCalendarInfo({ ...base, events })?.location).toBe('Emerald Events Place');
  });

  it('titles the entry with the couple names and links to the details page', () => {
    const info = buildCalendarInfo({ ...base, events: [ev('2027-02-12T08:30:00.000Z')] });
    expect(info?.title).toBe("Caleb & Raissa's Wedding");
    expect(info?.description).toBe('Details: https://raissaandcaleb.com/details');
  });
});

describe('renderIcs', () => {
  const now = new Date('2026-10-27T00:00:00.000Z');
  const timed = {
    title: "Caleb & Raissa's Wedding",
    location: 'Antipolo, Rizal',
    description: 'Details: https://raissaandcaleb.com/details',
    allDay: false,
    start: '2027-02-12T08:30:00.000Z',
    end: '2027-02-12T14:00:00.000Z',
  };

  it('produces a valid VCALENDAR with CRLF line endings and UTC times', () => {
    const ics = renderIcs(timed, 'raissaandcaleb.com', now);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/);
    expect(ics).toContain('DTSTART:20270212T083000Z\r\n');
    expect(ics).toContain('DTEND:20270212T140000Z\r\n');
    expect(ics).toContain('DTSTAMP:20261027T000000Z\r\n');
    expect(ics).toContain('UID:wedding@raissaandcaleb.com\r\n');
    expect(ics).toContain('LOCATION:Antipolo\\, Rizal\r\n');
  });

  it('uses DATE values for all-day entries', () => {
    const ics = renderIcs({ ...timed, allDay: true, start: '2027-02-12', end: '2027-02-13' }, 'raissaandcaleb.com', now);
    expect(ics).toContain('DTSTART;VALUE=DATE:20270212\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20270213\r\n');
  });

  it('escapes special characters and omits LOCATION when there is none', () => {
    const ics = renderIcs({ ...timed, title: 'A; B, C\\D\nE', location: null }, 'raissaandcaleb.com', now);
    expect(ics).toContain('SUMMARY:A\; B\\, C\\\\D\\nE\r\n');
    expect(ics).not.toContain('LOCATION:');
  });

  it('folds lines longer than 75 bytes', () => {
    const ics = renderIcs({ ...timed, description: 'x'.repeat(200) }, 'raissaandcaleb.com', now);
    const physical = ics.split('\r\n');
    for (const line of physical) expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).toContain(`DESCRIPTION:${'x'.repeat(200)}\r\n`);
  });
});
