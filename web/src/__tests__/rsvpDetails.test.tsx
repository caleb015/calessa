import React from 'react';
import { render, screen, within } from '@testing-library/react';
import RsvpPage from '@/app/(public)/rsvp/page';
import RsvpCodePage from '@/app/(public)/rsvp/[code]/page';
import RsvpInvitationView from '@/components/public/RsvpInvitationView';
import WeddingAtAGlance from '@/components/public/WeddingAtAGlance';
import { weddingDetails } from '@/lib/weddingDetails';
import { publicApi } from '@/lib/api';
import type { WeddingEvent } from '@/types/api';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/rsvp',
  useSearchParams: () => new URLSearchParams(),
  redirect: jest.fn(),
}));
jest.mock('next/image', () => ({ __esModule: true, default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));
jest.mock('@/components/public/RsvpForm', () => ({ __esModule: true, default: () => <p>RSVP form</p> }));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  publicApi: { getSettings: jest.fn(), getEvents: jest.fn(), getRsvpByCode: jest.fn() },
}));
const api = publicApi as unknown as Record<string, jest.Mock>;

const MAP = 'https://maps.app.goo.gl/FaTdUXchr5wKRNfH8';
const event = (over: Partial<WeddingEvent> = {}): WeddingEvent => ({
  id: 'e1', tagline: null, title: 'Ceremony & Reception', venueName: 'The Emerald Events Place', address: 'Antipolo, Rizal',
  startTime: '2027-02-12T08:00:00.000Z', endTime: null, mapUrl: MAP, notes: null, displayOrder: 0, showOnHomepage: true, ...over,
});
const afterparty = event({ id: 'e2', title: 'Afterparty', venueName: 'The Pavo Luxury Villa', address: null, startTime: '2027-02-12T13:00:00.000Z', showOnHomepage: false });
const settings = { weddingDate: '2027-02-12T07:00:00.000Z' };
const GUEST = { id: 'g1', primaryName: 'Maria Santos', email: null, phone: null, allowedPartySize: 1, plusOneAllowed: false, requiresMealSelection: false, rsvp: null };

beforeEach(() => jest.clearAllMocks());

describe('weddingDetails', () => {
  it('takes the date from Settings and the place and time from the homepage event, in Manila time', () => {
    expect(weddingDetails(settings, [afterparty, event()])).toEqual({
      date: 'February 12, 2027', time: '4:00 PM',
      venue: 'The Emerald Events Place', address: 'Antipolo, Rizal', mapUrl: MAP,
    });
  });

  it('uses the first event when none is on the homepage, and its start when no wedding date is set', () => {
    const d = weddingDetails({ weddingDate: null }, [event({ id: 'b', displayOrder: 1, showOnHomepage: false }), { ...afterparty, displayOrder: 0 }]);
    expect(d).toMatchObject({ venue: 'The Pavo Luxury Villa', time: '9:00 PM', date: 'February 12, 2027' });
  });

  it('leaves out empty fields and anything that isn\'t a web link', () => {
    expect(weddingDetails(settings, [event({ address: '  ', mapUrl: 'javascript:alert(1)' })])).toMatchObject({ address: null, mapUrl: null });
  });

  it('has nothing to show without a date or a place', () => {
    expect(weddingDetails({ weddingDate: null }, [])).toBeNull();
    expect(weddingDetails(null, [event({ venueName: null, address: null, startTime: null })])).toBeNull();
  });

  it('still shows the date when there are no events', () => {
    expect(weddingDetails(settings, [])).toMatchObject({ date: 'February 12, 2027', venue: null, time: null });
  });
});

describe('WeddingAtAGlance', () => {
  const details = weddingDetails(settings, [event()])!;

  it('as a line: the date (no weekday, larger), then the venue linking to the map in a new tab', () => {
    render(<WeddingAtAGlance details={details} variant="line" />);
    const date = screen.getByText('February 12, 2027');
    expect(date).toHaveClass('font-serif', 'text-xl');
    expect(screen.queryByText(/Friday/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /The Emerald Events Place/ })).toHaveClass('text-[11px]');
    const link = screen.getByRole('link', { name: /The Emerald Events Place/ });
    expect(link).toHaveAttribute('href', MAP);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('as a line: the venue as plain text without a map link', () => {
    render(<WeddingAtAGlance details={{ ...details, mapUrl: null }} variant="line" />);
    expect(screen.getByText('The Emerald Events Place')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('as a panel: when (date and time, no weekday) and where (venue, address and map)', () => {
    render(<WeddingAtAGlance details={details} variant="panel" />);
    const panel = screen.getByRole('region', { name: 'Wedding date and location' });
    expect(within(panel).getByText('When')).toBeInTheDocument();
    expect(within(panel).getByText('February 12, 2027')).toHaveClass('whitespace-nowrap');
    expect(within(panel).getByText('4:00 PM')).toBeInTheDocument();
    expect(within(panel).queryByText(/Friday/)).not.toBeInTheDocument();
    expect(within(panel).getByText('Where')).toBeInTheDocument();
    expect(within(panel).getByText('Antipolo, Rizal')).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: /Open map/ })).toHaveAttribute('href', MAP);
  });

  it('as a panel: only "When" when there is no place', () => {
    render(<WeddingAtAGlance details={{ ...details, venue: null, address: null, mapUrl: null }} variant="panel" />);
    expect(screen.getByText('When')).toBeInTheDocument();
    expect(screen.queryByText('Where')).not.toBeInTheDocument();
  });
});

describe('RSVP pages', () => {
  it('shows the date and place just below the RSVP heading on the first screen', async () => {
    api.getSettings.mockResolvedValue({ coupleNameA: 'Raissa', coupleNameB: 'Caleb', ...settings });
    api.getEvents.mockResolvedValue([afterparty, event()]);
    render(await RsvpPage({ searchParams: Promise.resolve({}) }));
    const heading = screen.getByRole('heading', { name: 'RSVP' });
    const date = screen.getByText('February 12, 2027');
    expect(heading.compareDocumentPosition(date) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(date.compareDocumentPosition(screen.getByRole('img', { name: 'Odie' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('link', { name: /The Emerald Events Place/ })).toHaveAttribute('href', MAP);
    expect(screen.queryByText(/Pavo/)).not.toBeInTheDocument();
  });

  it('still opens when the events cannot be loaded', async () => {
    api.getSettings.mockResolvedValue({ coupleNameA: 'Raissa', coupleNameB: 'Caleb', ...settings });
    api.getEvents.mockRejectedValue(new Error('down'));
    render(await RsvpPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText('February 12, 2027')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'RSVP' })).toBeInTheDocument();
  });

  it('shows nothing extra when there is no date or place', async () => {
    api.getSettings.mockResolvedValue({ coupleNameA: 'Raissa', coupleNameB: 'Caleb', weddingDate: null });
    api.getEvents.mockResolvedValue([]);
    render(await RsvpPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByText(/2027/)).not.toBeInTheDocument();
  });

  it('shows when and where above the form once the invitation is open', () => {
    render(<RsvpInvitationView code="ABC" guest={GUEST} settings={null} details={weddingDetails(settings, [event()])} />);
    const panel = screen.getByRole('region', { name: 'Wedding date and location' });
    expect(within(panel).getByText('The Emerald Events Place')).toBeInTheDocument();
    expect(panel.compareDocumentPosition(screen.getByText('RSVP form')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows when and where for a guest opening their RSVP link to update it', async () => {
    api.getRsvpByCode.mockResolvedValue({ ...GUEST, rsvp: { id: 'r1', status: 'ATTENDING' } });
    api.getSettings.mockResolvedValue({ ...settings, isRsvpEnabled: true });
    api.getEvents.mockResolvedValue([event()]);
    render(await RsvpCodePage({ params: Promise.resolve({ code: 'ABC' }) }));
    expect(screen.getByRole('region', { name: 'Wedding date and location' })).toHaveTextContent('February 12, 2027');
  });

  it('keeps the "not found" page plain', () => {
    render(<RsvpInvitationView code="NOPE" guest={null} settings={null} details={weddingDetails(settings, [event()])} />);
    expect(screen.getByRole('heading', { name: 'Invitation Not Found' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Wedding date and location' })).not.toBeInTheDocument();
  });
});
