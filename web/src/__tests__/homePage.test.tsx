import { render, screen } from '@testing-library/react';
import HomePage from '@/app/(public)/page';
import EventCard from '@/components/public/details/EventCard';
import { publicApi } from '@/lib/api';

jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/public/Countdown', () => ({ __esModule: true, default: () => null }));
jest.mock('@/lib/api', () => ({ publicApi: { getSettings: jest.fn(), getEvents: jest.fn() } }));

const event = {
  id: 'e1', title: 'Ceremony & Reception', tagline: 'Where forever begins', venueName: 'The Emerald Events Place',
  address: null, startTime: '2027-02-12T08:30:00.000Z', endTime: null, mapUrl: null, notes: null, displayOrder: 0, showOnHomepage: true,
};

beforeEach(() => {
  (publicApi.getSettings as jest.Mock).mockResolvedValue(null);
  (publicApi.getEvents as jest.Mock).mockResolvedValue([event]);
});

describe('Homepage event cards', () => {
  it('show the event without its tagline', async () => {
    render(await HomePage());
    expect(screen.getByRole('heading', { name: 'Ceremony & Reception' })).toBeInTheDocument();
    expect(screen.getByText('The Emerald Events Place')).toBeInTheDocument();
    expect(screen.queryByText('Where forever begins')).not.toBeInTheDocument();
  });

  it('show the address as a link to the map, opening in a new tab', async () => {
    (publicApi.getEvents as jest.Mock).mockResolvedValue([{ ...event, address: 'Antipolo City', mapUrl: 'https://maps.app.goo.gl/abc' }]);
    render(await HomePage());
    const link = screen.getByRole('link', { name: /Antipolo City/ });
    expect(link).toHaveAttribute('href', 'https://maps.app.goo.gl/abc');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveAccessibleName('Antipolo City (opens map in a new tab)');
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true'); // map pin
  });

  it('show the address as plain text when there is no usable map link', async () => {
    for (const mapUrl of [null, 'javascript:alert(1)']) {
      (publicApi.getEvents as jest.Mock).mockResolvedValue([{ ...event, address: 'Antipolo City', mapUrl }]);
      const { unmount } = render(await HomePage());
      expect(screen.getByText('Antipolo City')).toBeInTheDocument();
      expect(screen.getByText('Antipolo City').querySelector('svg')).toBeInTheDocument(); // map pin
      expect(screen.queryByRole('link', { name: /Antipolo City/ })).not.toBeInTheDocument();
      unmount();
    }
  });

  it('leave the address line out when there is no address', async () => {
    render(await HomePage());
    expect(screen.queryByText(/opens map/)).not.toBeInTheDocument();
  });

  it('still show the tagline on the Details page cards', () => {
    render(<EventCard event={event as never} />);
    expect(screen.getByText('Where forever begins')).toBeInTheDocument();
  });
});
