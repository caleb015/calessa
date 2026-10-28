import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { formatDetailsDate, formatEventTime, googleCalendarUrl } from '@/lib/details';
import DetailsHeader from '@/components/public/details/DetailsHeader';
import EventCard from '@/components/public/details/EventCard';
import DressCode from '@/components/public/details/DressCode';
import DetailsCta from '@/components/public/details/DetailsCta';
import type { CalendarInfo, WeddingEvent } from '@/types/api';

const calendar: CalendarInfo = {
  title: "Caleb & Raissa's Wedding",
  location: 'Antipolo, Rizal',
  description: 'Details: https://raissaandcaleb.com/details',
  allDay: false,
  start: '2027-02-12T08:30:00.000Z',
  end: '2027-02-12T14:00:00.000Z',
};

const event = (over: Partial<WeddingEvent> = {}): WeddingEvent => ({
  id: 'e1',
  tagline: 'Where forever begins',
  title: 'Ceremony & Reception',
  venueName: 'The Emerald Events Place',
  address: '123 Street',
  startTime: '2027-02-12T08:30:00.000Z',
  endTime: '2027-02-12T13:00:00.000Z',
  mapUrl: 'https://maps.example.com/emerald',
  notes: 'Arrive early',
  displayOrder: 0,
  showOnHomepage: true,
  ...over,
});

describe('details helpers (Manila time)', () => {
  it('formats the date in the mockup style', () => {
    expect(formatDetailsDate('2027-02-11T17:00:00.000Z')).toBe('12 February 2027');
  });

  it('formats event times in Manila', () => {
    expect(formatEventTime('2027-02-12T08:30:00.000Z')).toBe('4:30 PM');
  });

  it('builds a Google Calendar link for timed and all-day entries', () => {
    const url = new URL(googleCalendarUrl(calendar));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe("Caleb & Raissa's Wedding");
    expect(url.searchParams.get('dates')).toBe('20270212T083000Z/20270212T140000Z');
    expect(url.searchParams.get('location')).toBe('Antipolo, Rizal');

    const allDay = new URL(googleCalendarUrl({ ...calendar, allDay: true, start: '2027-02-12', end: '2027-02-13', location: null }));
    expect(allDay.searchParams.get('dates')).toBe('20270212/20270213');
    expect(allDay.searchParams.has('location')).toBe(false);
  });
});

describe('DetailsHeader', () => {
  const header = { eyebrow: 'The Wedding', title: 'Details', location: 'Antipolo, Rizal' };

  it('shows eyebrow, title, date, location and the calendar menu', () => {
    render(<DetailsHeader header={header} calendar={calendar} weddingDate="2027-02-12T07:00:00.000Z" icsUrl="https://api.test/public/calendar.ics" />);
    expect(screen.getByText('The Wedding')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Details' })).toBeInTheDocument();
    expect(screen.getByText('12 February 2027')).toBeInTheDocument();
    expect(screen.getByText('Antipolo, Rizal')).toBeInTheDocument();
    expect(screen.getByText('Add to Calendar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Apple / Outlook (.ics)' })).toHaveAttribute('href', 'https://api.test/public/calendar.ics');
    expect(screen.getByRole('link', { name: 'Google Calendar' }).getAttribute('href')).toContain('calendar.google.com');
  });

  it('hides location, date and calendar when not available', () => {
    render(<DetailsHeader header={{ ...header, location: null }} calendar={null} weddingDate={null} icsUrl="x" />);
    expect(screen.queryByText('Antipolo, Rizal')).not.toBeInTheDocument();
    expect(screen.queryByText('Add to Calendar')).not.toBeInTheDocument();
  });
});

describe('EventCard', () => {
  it('shows tagline, title, start time | venue, and a map link — but not end time, address or notes', () => {
    const { container } = render(<EventCard event={event()} />);
    expect(screen.getByText('Where forever begins')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ceremony & Reception' })).toBeInTheDocument();
    expect(screen.getByText(/4:30 PM\s+\|\s+The Emerald Events Place/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View on map →' })).toHaveAttribute('href', 'https://maps.example.com/emerald');
    expect(container.textContent).not.toContain('9:00 PM');
    expect(container.textContent).not.toContain('123 Street');
    expect(container.textContent).not.toContain('Arrive early');
  });

  it('omits the tagline, time, and map link when missing', () => {
    render(<EventCard event={event({ tagline: null, startTime: null, mapUrl: null })} />);
    expect(screen.queryByText('Where forever begins')).not.toBeInTheDocument();
    expect(screen.getByText('The Emerald Events Place')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('DressCode', () => {
  it('renders guidelines with notes and one swatch per palette color', () => {
    render(
      <DressCode
        dressCode={{
          eyebrow: 'Come in color!',
          title: 'The Dress Code',
          intro: 'Solid colors please.',
          palette: ['#9fb6cd', '#a8a060'],
          guidelines: [
            { id: 'g1', label: 'For the Ladies', text: 'Maxi or midi dresses', note: 'Please avoid white and beige.' },
            { id: 'g2', label: 'For the Gentlemen', text: 'Barongs or suits', note: null },
          ],
        }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'The Dress Code' })).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByText('For the Ladies:')).toBeInTheDocument();
    expect(within(items[0]).getByText('Please avoid white and beige.')).toBeInTheDocument();
    expect(items).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'Color #9fb6cd' })).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });
});

describe('DetailsCta', () => {
  it('links the button to the schedule page', () => {
    render(<DetailsCta cta={{ heading: 'Want to see the Full Day?', subtext: 'Planned out (mostly).', buttonLabel: "View the Day's Schedule" }} />);
    expect(screen.getByRole('heading', { name: 'Want to see the Full Day?' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "View the Day's Schedule →" })).toHaveAttribute('href', '/schedule');
  });
});
