import { cleanup, render, screen, within } from '@testing-library/react';
import HomePage from '@/app/(public)/page';
import EventCard from '@/components/public/details/EventCard';
import { publicApi } from '@/lib/api';

// Only the hero photo is drawn (as a plain img carrying its class and style); other images are left out.
// getImageProps (the phone/computer hero pair) hands back a recognisable srcSet for each photo.
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, src, className, style }: { alt: string; src: string; className?: string; style?: object }) => (alt === 'Hero' ? <img alt={alt} src={src} className={className} style={style} /> : null),
  getImageProps: ({ src, alt }: { src: string; alt: string }) => ({
    props: { src: `/_next/image?url=${src}`, srcSet: `/_next/image?url=${src} 1x`, alt, style: { position: 'absolute' } },
  }),
}));
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

describe('Hero text placement', () => {
  const heroText = async (over: object) => {
    (publicApi.getSettings as jest.Mock).mockResolvedValue(settings(over));
    render(await HomePage());
    return screen.getByTestId('hero-text');
  };

  it('centres the names by default, with no shift', async () => {
    const block = await heroText({});
    expect(block).toHaveAttribute('data-align', 'center');
    expect(block).toHaveClass('items-center', 'text-center');
    expect(block.parentElement).toHaveClass('justify-center');
    expect(block.style.getPropertyValue('--hero-text-offset')).toBe('');
    expect(within(block).getAllByRole('heading').map(h => h.textContent)).toEqual(['Caleb', 'Raissa']);
  });

  it('lines the text up on the left within its own width, and moves it only by the offset, from tablet width up', async () => {
    const block = await heroText({ heroTextAlign: 'left', heroTextOffset: '-120px' });
    expect(block).toHaveClass('items-start', 'text-left', 'md:left-[var(--hero-text-offset,0px)]');
    expect(block.parentElement).toHaveClass('justify-center'); // the block stays centred on the photo
    expect(block.style.getPropertyValue('--hero-text-offset')).toBe('-120px');
    expect(within(block).getByRole('link', { name: 'RSVP' })).toHaveAttribute('href', '/rsvp');
  });

  it.each([
    ['right', 'items-end', 'text-right'],
    ['justify', 'items-stretch', 'text-justify'],
  ])('lines it up %s within its own width', async (align, items, text) => {
    const block = await heroText({ heroTextAlign: align });
    expect(block).toHaveClass(items, text);
    expect(block.parentElement).toHaveClass('justify-center');
    expect(within(block).getByRole('link', { name: 'RSVP' })).toHaveClass('[text-align-last:center]'); // the label stays centred
  });

  it.each([
    ['10%', '10%'],
    ['-40px', '-40px'],
    ['80', '80px'], // a plain number is pixels
    ['0', ''],
    ['10em', ''], // not pixels or percent: ignored
    ['1px; color: red', ''],
  ])('turns an offset of %s into %s', async (offset, css) => {
    const block = await heroText({ heroTextOffset: offset });
    expect(block.style.getPropertyValue('--hero-text-offset')).toBe(css);
  });

  it.each([
    ['40px', '-40px'], // positive moves it up, like the photo's own offset
    ['-15%', '15%'],
    ['30', '-30px'],
    ['0', ''],
    ['10vh', ''],
  ])('moves it vertically for an offset of %s (top: %s), on phones too', async (offset, top) => {
    const block = await heroText({ heroTextOffsetY: offset });
    expect(block).toHaveClass('md:top-[var(--hero-text-top,0px)]', 'top-[var(--hero-text-top-phone,0px)]');
    expect(block.style.getPropertyValue('--hero-text-top')).toBe(top);
    expect(block.style.getPropertyValue('--hero-text-top-phone')).toBe(top);
  });

  it('gives phones their own vertical offset when set, leaving computers on theirs', async () => {
    const block = await heroText({ heroTextOffsetY: '10%', heroMobileTextOffsetY: '-60px' });
    expect(block.style.getPropertyValue('--hero-text-top')).toBe('-10%');
    expect(block.style.getPropertyValue('--hero-text-top-phone')).toBe('60px');
  });

  it('can move the text on phones only', async () => {
    const block = await heroText({ heroMobileTextOffsetY: '25%' });
    expect(block.style.getPropertyValue('--hero-text-top')).toBe('');
    expect(block.style.getPropertyValue('--hero-text-top-phone')).toBe('-25%');
  });

  it('keeps phones still with a phone offset of 0, whatever computers do', async () => {
    const block = await heroText({ heroTextOffsetY: '10%', heroMobileTextOffsetY: '0' });
    expect(block.style.getPropertyValue('--hero-text-top-phone')).toBe('');
  });

  it('lets phones follow the computer offset when the phone one is empty or unusable', async () => {
    for (const phone of ['', '  ', '10vh']) {
      const block = await heroText({ heroTextOffsetY: '10%', heroMobileTextOffsetY: phone });
      expect(block.style.getPropertyValue('--hero-text-top-phone')).toBe('-10%');
      cleanup();
    }
  });

  it('keeps the text over the whole photo, centred until moved', async () => {
    const block = await heroText({});
    expect(block.parentElement).toHaveClass('absolute', 'inset-0', 'items-center', 'justify-center');
    expect(block.style.getPropertyValue('--hero-text-top')).toBe('');
    expect(block.style.getPropertyValue('--hero-text-top-phone')).toBe('');
  });

  it('writes the names and "&" in the Hero names font, or the headings font by default', async () => {
    const block = await heroText({});
    [...within(block).getAllByRole('heading'), within(block).getByText('&')].forEach(el =>
      expect(el).toHaveClass('font-hero'));
  });

  it('falls back to centred for an unknown alignment', async () => {
    expect(await heroText({ heroTextAlign: 'middle' })).toHaveAttribute('data-align', 'center');
  });
});

describe('Hero photo for phones', () => {
  const PHONE = CLD('phone-hero');
  const hero = async (over: object) => {
    (publicApi.getSettings as jest.Mock).mockResolvedValue(settings({ heroImageUrl: CLD('wide-hero'), ...over }));
    const { container } = render(await HomePage());
    return { img: screen.getByAltText('Hero'), picture: container.querySelector('picture') };
  };

  it('uses one photo everywhere when no phone photo is set, offsets and all', async () => {
    const { img, picture } = await hero({ heroImageOffsetX: 10, heroImageOffsetY: 5 });
    expect(picture).toBeNull();
    expect(img).toHaveAttribute('src', CLD('wide-hero'));
    expect(img.style.transform).toBe('translate(10%, -5%)');
  });

  it('gives phones their own photo and computers the main one, so each downloads only its own', async () => {
    const { img, picture } = await hero({ heroMobileImageUrl: PHONE });
    const source = picture!.querySelector('source')!;
    expect(source).toHaveAttribute('media', '(min-width: 768px)');
    expect(source).toHaveAttribute('srcset', expect.stringContaining('wide-hero'));
    expect(img).toHaveAttribute('src', expect.stringContaining('phone-hero'));
    expect(img).toHaveAttribute('srcset', expect.stringContaining('phone-hero'));
    expect(img).toHaveClass('object-cover');
  });

  it('applies the photo offsets to the computer photo only', async () => {
    const { img } = await hero({ heroMobileImageUrl: PHONE, heroImageOffsetX: 10, heroImageOffsetY: 5 });
    expect(img).toHaveClass('md:[transform:var(--hero-shift)]');
    expect(img.style.transform).toBe('');
    expect(img.style.getPropertyValue('--hero-shift')).toBe('translate(10%, -5%)');
  });

  it.each([
    [20, '-20%', '120%'], // up: a taller box reaching above the hero, so its lower part shows
    [-10, '0%', '110%'], // down: a taller box reaching below, so its upper part shows
  ])('moves the phone photo by its own vertical offset (%s) without leaving a gap', async (offset, top, height) => {
    const { img } = await hero({ heroMobileImageUrl: PHONE, heroMobileImageOffsetY: offset });
    expect(img).toHaveClass('max-md:top-[var(--hero-phone-top)]!', 'max-md:h-[var(--hero-phone-height)]!');
    expect(img.style.getPropertyValue('--hero-phone-top')).toBe(top);
    expect(img.style.getPropertyValue('--hero-phone-height')).toBe(height);
  });

  it('moves the main photo on phones too when there is no phone photo, leaving computers to their own offsets', async () => {
    const { img, picture } = await hero({ heroMobileImageOffsetY: 15, heroImageOffsetY: 5 });
    expect(picture).toBeNull();
    expect(img).toHaveClass('md:[transform:var(--hero-shift)]', 'max-md:top-[var(--hero-phone-top)]!');
    expect(img.style.transform).toBe('');
    expect(img.style.getPropertyValue('--hero-shift')).toBe('translate(0%, -5%)');
    expect(img.style.getPropertyValue('--hero-phone-top')).toBe('-15%');
  });

  it('leaves the phone photo unmoved when its offset is not set', async () => {
    const { img } = await hero({ heroMobileImageUrl: PHONE });
    expect(img.className).not.toContain('hero-phone-top');
  });

  it('ignores a blank phone photo', async () => {
    const { picture } = await hero({ heroMobileImageUrl: '  ' });
    expect(picture).toBeNull();
  });
});
