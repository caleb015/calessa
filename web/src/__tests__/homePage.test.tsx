import { render, screen, within } from '@testing-library/react';
import HomePage from '@/app/(public)/page';
import EventCard from '@/components/public/details/EventCard';
import { publicApi } from '@/lib/api';

jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/public/Countdown', () => ({ __esModule: true, default: () => null }));
jest.mock('@/lib/api', () => ({
  publicApi: { getSettings: jest.fn(), getEvents: jest.fn(), getStory: jest.fn(), getHomepageGallery: jest.fn() },
}));

const event = {
  id: 'e1', title: 'Ceremony & Reception', tagline: 'Where forever begins', venueName: 'The Emerald Events Place',
  address: null, startTime: '2027-02-12T08:30:00.000Z', endTime: null, mapUrl: null, notes: null, displayOrder: 0, showOnHomepage: true,
};

beforeEach(() => {
  (publicApi.getSettings as jest.Mock).mockResolvedValue(null);
  (publicApi.getEvents as jest.Mock).mockResolvedValue([event]);
  (publicApi.getStory as jest.Mock).mockResolvedValue([]);
  (publicApi.getHomepageGallery as jest.Mock).mockResolvedValue({ images: [], total: 0, seed: null });
});

const CLD = (id: string, ext = 'jpg') => `https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_2400/v1/calessa/${id}.${ext}`;
const story = (id: string, imageUrl: string | null, dateLabel = 'June 2018') => ({ id, title: `Story ${id}`, dateLabel, description: null, imageUrl, displayOrder: 0 });
const photo = (id: string) => ({ id, title: `Photo ${id}`, description: null, imageUrl: CLD(id), displayOrder: 0, sharedBy: null });
const settings = (over: object) => ({ coupleNameA: 'Caleb', coupleNameB: 'Raissa', weddingDate: null, ...over });

describe('Homepage photos', () => {
  it('shows only the welcome message and a plain RSVP banner when no photos are set up', async () => {
    render(await HomePage());
    expect(screen.queryByAltText('Caleb & Raissa')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'How we got here' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'With the people we love' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Will you join us?' }).closest('section')!.querySelector('img')).toBeNull();
  });

  it('puts the welcome photo beside the welcome message', async () => {
    (publicApi.getSettings as jest.Mock).mockResolvedValue(settings({ welcomeImageUrl: CLD('portrait') }));
    render(await HomePage());
    const img = screen.getByAltText('Caleb & Raissa');
    expect(img).toHaveAttribute('src', expect.stringContaining(',c_limit,w_1000/'));
    expect(img.closest('section')).toHaveTextContent('We are so excited to celebrate');
  });

  it('peeks at the first three story milestones that have a photo, as stills linking to the story', async () => {
    (publicApi.getStory as jest.Mock).mockResolvedValue([
      story('1', ''), story('2', CLD('walk', 'gif'), 'April 2018'), story('3', null), story('4', CLD('shoes', 'gif')),
      story('5', CLD('bike', 'gif')), story('6', CLD('later', 'gif')),
    ]);
    render(await HomePage());
    expect(screen.getByRole('heading', { name: 'How we got here' })).toBeInTheDocument();
    const pics = ['Story 2', 'Story 4', 'Story 5'].map(t => screen.getByAltText(t));
    expect(screen.queryByAltText('Story 6')).not.toBeInTheDocument();
    expect(pics[0]).toHaveAttribute('src', expect.stringContaining('/pg_10/f_jpg,q_auto,c_fill,g_auto,w_800,h_600/v1/calessa/walk.gif'));
    expect(screen.getByText('April 2018')).toBeInTheDocument();
    expect(pics[0].closest('a')).toHaveAttribute('href', '/story');
    expect(screen.getByRole('link', { name: 'Read our story →' })).toHaveAttribute('href', '/story');
  });

  it('starts the Moments slider with the first page of photos, with a link to the gallery', async () => {
    (publicApi.getHomepageGallery as jest.Mock).mockResolvedValue({ images: ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(photo), total: 300, seed: 77 });
    render(await HomePage());
    expect(publicApi.getHomepageGallery).toHaveBeenCalledWith(); // first page only
    expect(screen.getByRole('heading', { name: 'With the people we love' })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Moments' })).getAllByRole('img')).toHaveLength(7);
    expect(screen.getByRole('link', { name: 'See the gallery →' })).toHaveAttribute('href', '/gallery');
  });

  it('sets the RSVP banner over its photo', async () => {
    (publicApi.getSettings as jest.Mock).mockResolvedValue(settings({ rsvpBannerImageUrl: CLD('fuji') }));
    render(await HomePage());
    const banner = screen.getByRole('heading', { name: 'Will you join us?' }).closest('section')!;
    expect(banner.querySelector('img')).toHaveAttribute('src', expect.stringContaining('/v1/calessa/fuji.jpg'));
    expect(screen.getByRole('link', { name: 'RSVP Now' })).toHaveAttribute('href', '/rsvp');
  });

  it('still shows the page when the story or homepage photos cannot be loaded', async () => {
    (publicApi.getStory as jest.Mock).mockRejectedValue(new Error('down'));
    (publicApi.getHomepageGallery as jest.Mock).mockRejectedValue(new Error('down'));
    render(await HomePage());
    expect(screen.getByRole('heading', { name: 'Ceremony & Reception' })).toBeInTheDocument();
  });
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
