import { act, fireEvent, render, screen, within } from '@testing-library/react';
import MomentsSlider from '@/components/public/MomentsSlider';
import { publicApi } from '@/lib/api';
import type { GalleryImage } from '@/types/api';

jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), publicApi: { getHomepageGallery: jest.fn() } }));
const getPage = publicApi.getHomepageGallery as jest.Mock;

const CLD = (id: string, ext = 'jpg') => `https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_2400/v1/calessa/${id}.${ext}`;
const photo = (id: string, ext = 'jpg'): GalleryImage => ({ id, title: `Photo ${id}`, description: null, imageUrl: CLD(id, ext), displayOrder: 0, sharedBy: null });
const six = () => ['a', 'b', 'c', 'd', 'e', 'f'].map(id => photo(id));

const CARD = 250; // card width + gap, in px
/**
 * jsdom has no layout: give the row a width, its photos their positions, and a real scrollLeft
 * (clamped like a browser's).
 */
function layout(count = 6, clientWidth = 1000) {
  const track = screen.getByRole('list', { name: 'Moments' });
  const scrollWidth = count * CARD;
  let left = 0;
  Object.defineProperty(track, 'clientWidth', { configurable: true, value: clientWidth });
  Object.defineProperty(track, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(track, 'scrollLeft', {
    configurable: true,
    get: () => left,
    set: (v: number) => { left = Math.max(0, Math.min(scrollWidth - clientWidth, v)); },
  });
  within(track).getAllByRole('listitem').forEach((li, i) => Object.defineProperty(li, 'offsetLeft', { configurable: true, value: i * CARD }));
  fireEvent.scroll(track);
  return track;
}

function reducedMotion(on: boolean) {
  window.matchMedia = jest.fn().mockImplementation((q: string) => ({ matches: on && q.includes('reduce'), media: q })) as unknown as typeof window.matchMedia;
}

const mouse = (x: number) => ({ pointerType: 'mouse', pointerId: 1, button: 0, clientX: x });

// jsdom has no PointerEvent; a MouseEvent carrying the pointer fields is enough for these tests.
beforeAll(() => {
  if (typeof window.PointerEvent === 'undefined') {
    class PointerEventStub extends MouseEvent {
      pointerType: string;
      pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerType = init.pointerType ?? '';
        this.pointerId = init.pointerId ?? 0;
      }
    }
    (window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventStub;
  }
});

beforeEach(() => reducedMotion(false));
afterEach(() => jest.useRealTimers());

describe('Moments slider', () => {
  it('shows every photo in the same tall 2:3 portrait frame, cropped rather than rotated', () => {
    render(<MomentsSlider photos={Array.from({ length: 12 }, (_, i) => photo(String(i)))} />);
    const items = within(screen.getByRole('list', { name: 'Moments' })).getAllByRole('listitem');
    expect(items).toHaveLength(12);
    items.forEach(li => expect(li).toHaveClass('aspect-[2/3]', 'snap-start'));
    const img = screen.getByAltText('Photo 0');
    expect(img).toHaveAttribute('src', expect.stringContaining('/f_auto,q_auto,c_fill,g_auto,w_800,h_1200/'));
    expect(img).toHaveClass('object-cover');
    expect(img.getAttribute('style') ?? '').not.toMatch(/rotate/);
  });

  it('snaps to a photo when swiped with a finger (the browser\'s own scrolling)', () => {
    render(<MomentsSlider photos={six()} />);
    expect(screen.getByRole('list', { name: 'Moments' })).toHaveClass('overflow-x-auto', 'snap-x', 'snap-mandatory');
  });

  it('shows GIFs as stills', () => {
    render(<MomentsSlider photos={[photo('party', 'gif')]} />);
    expect(screen.getByAltText('Photo party')).toHaveAttribute('src', expect.stringContaining('/pg_10/f_jpg,'));
  });

  it('glides one photo per arrow press and lands exactly on it, pausing snapping only while moving', async () => {
    jest.useFakeTimers();
    render(<MomentsSlider photos={six()} />);
    const track = layout();
    expect(screen.getByRole('button', { name: 'Previous photos' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Next photos' }));
    await act(async () => { jest.advanceTimersByTime(100); });
    expect(track.style.scrollSnapType).toBe('none'); // mid-glide
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(track.scrollLeft).toBe(CARD);
    expect(track.style.scrollSnapType).toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'Next photos' }));
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(track.scrollLeft).toBe(2 * CARD);
    expect(screen.getByRole('button', { name: 'Next photos' })).toBeDisabled(); // the end of the row

    fireEvent.click(screen.getByRole('button', { name: 'Previous photos' }));
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(track.scrollLeft).toBe(CARD);
  });

  it('can be dragged with a mouse, settling on the nearest photo when let go', async () => {
    jest.useFakeTimers();
    render(<MomentsSlider photos={six()} />);
    const track = layout();

    fireEvent.pointerDown(track, mouse(600));
    expect(track).toHaveClass('cursor-grabbing');
    fireEvent.pointerMove(track, mouse(500));
    expect(track.scrollLeft).toBe(100); // follows the mouse
    await act(async () => { jest.advanceTimersByTime(500); }); // hold still before letting go: no flick
    fireEvent.pointerMove(track, mouse(500));
    fireEvent.pointerUp(track, mouse(500));
    expect(track).toHaveClass('cursor-grab');
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(track.scrollLeft).toBe(0); // 100px in: nearer the first photo

    fireEvent.pointerDown(track, mouse(600));
    fireEvent.pointerMove(track, mouse(400));
    await act(async () => { jest.advanceTimersByTime(500); });
    fireEvent.pointerMove(track, mouse(400));
    fireEvent.pointerUp(track, mouse(400));
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(track.scrollLeft).toBe(CARD); // 200px in: nearer the second
  });

  it('carries a quick flick on to a later photo', async () => {
    jest.useFakeTimers();
    render(<MomentsSlider photos={six()} />);
    const track = layout();
    fireEvent.pointerDown(track, mouse(600));
    for (let x = 580; x >= 480; x -= 20) {
      await act(async () => { jest.advanceTimersByTime(10); });
      fireEvent.pointerMove(track, mouse(x)); // fast: 2px per ms
    }
    fireEvent.pointerUp(track, mouse(480));
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(track.scrollLeft).toBeGreaterThanOrEqual(CARD); // dragged only 120px, but the flick carries it on
  });

  it('carries even a very fast flick no more than about one screen of photos', async () => {
    jest.useFakeTimers();
    render(<MomentsSlider photos={Array.from({ length: 20 }, (_, i) => photo(String(i)))} />);
    const track = layout(20);
    fireEvent.pointerDown(track, mouse(700));
    await act(async () => { jest.advanceTimersByTime(1); });
    fireEvent.pointerMove(track, mouse(650));
    await act(async () => { jest.advanceTimersByTime(1); });
    fireEvent.pointerMove(track, mouse(600)); // 50px per ms: far faster than any hand
    fireEvent.pointerUp(track, mouse(600));
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(track.scrollLeft).toBeLessThanOrEqual(100 + 1000 * 0.75 + CARD / 2); // drag + at most 3/4 of the row
    expect(track.scrollLeft % CARD).toBe(0); // and still lands on a photo
  });

  it('leaves finger swipes to the browser', () => {
    render(<MomentsSlider photos={six()} />);
    const track = layout();
    fireEvent.pointerDown(track, { pointerType: 'touch', pointerId: 2, clientX: 600 });
    fireEvent.pointerMove(track, { pointerType: 'touch', pointerId: 2, clientX: 400 });
    expect(track.scrollLeft).toBe(0);
    expect(track.style.scrollSnapType).toBe('');
  });

  it('moves straight to the photo, without gliding, for people who turn off animations', () => {
    reducedMotion(true);
    render(<MomentsSlider photos={six()} />);
    const track = layout();
    fireEvent.click(screen.getByRole('button', { name: 'Next photos' }));
    expect(track.scrollLeft).toBe(CARD);
  });

  it('has no arrows for a single photo', () => {
    render(<MomentsSlider photos={[photo('only')]} />);
    expect(screen.queryByRole('button', { name: /photos/ })).not.toBeInTheDocument();
  });

  it('falls back to the original when a resized copy cannot be made', () => {
    render(<MomentsSlider photos={[photo('huge', 'gif')]} />);
    const img = screen.getByAltText('Photo huge');
    fireEvent.error(img);
    expect(img).toHaveAttribute('src', CLD('huge', 'gif'));
  });

  it('loads small copies sized to the screen, lazily', () => {
    render(<MomentsSlider photos={[photo('a')]} />);
    const img = screen.getByAltText('Photo a');
    expect(img).toHaveAttribute('srcset', expect.stringContaining(',c_fill,g_auto,w_500,h_750/'));
    expect(img).toHaveAttribute('sizes', expect.stringContaining('250px'));
    expect(img).toHaveAttribute('loading', 'lazy');
  });
});

describe('Moments slider with many photos', () => {
  const ids = (n: number, from = 0) => Array.from({ length: n }, (_, i) => String(from + i));
  beforeEach(() => getPage.mockReset());

  it('fetches the next photos as the row nears its end, keeping the same shuffle', async () => {
    getPage.mockResolvedValueOnce({ images: ids(4, 4).map(id => photo(id)), total: 10, seed: 55 });
    render(<MomentsSlider photos={ids(4).map(id => photo(id))} total={10} seed={55} />);
    layout(4); // the whole first page fits on screen: the end is near
    expect(getPage).toHaveBeenCalledWith(4, 55);
    expect(await screen.findByAltText('Photo 7')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Moments' })).getAllByRole('listitem')).toHaveLength(8);
  });

  it('keeps the next arrow while more photos are still to come', () => {
    getPage.mockReturnValue(new Promise(() => {})); // still loading
    render(<MomentsSlider photos={ids(6).map(id => photo(id))} total={20} />);
    const track = layout(6);
    track.scrollLeft = 500; // at the end of what's loaded
    fireEvent.scroll(track);
    expect(screen.getByRole('button', { name: 'Next photos' })).toBeEnabled();
  });

  it('stops asking once every photo is shown, and never shows one twice', async () => {
    getPage.mockResolvedValueOnce({ images: [...ids(2, 3), '4', '5'].map(id => photo(id)), total: 6, seed: null }); // '4' arrives twice
    render(<MomentsSlider photos={ids(3).map(id => photo(id))} total={6} />);
    layout(3);
    await screen.findByAltText('Photo 5');
    const items = within(screen.getByRole('list', { name: 'Moments' })).getAllByRole('listitem');
    expect(items).toHaveLength(6);
    fireEvent.scroll(screen.getByRole('list', { name: 'Moments' }));
    expect(getPage).toHaveBeenCalledTimes(1);
  });

  it('does not ask for more when every photo came with the page', () => {
    render(<MomentsSlider photos={ids(5).map(id => photo(id))} total={5} />);
    layout(5);
    expect(getPage).not.toHaveBeenCalled();
  });

  it('asks for one page at a time, however much the row is scrolled meanwhile', async () => {
    let finish: (v: unknown) => void = () => {};
    getPage
      .mockReturnValueOnce(new Promise(r => { finish = r; }))
      .mockResolvedValueOnce({ images: ids(3, 6).map(id => photo(id)), total: 9, seed: null });
    render(<MomentsSlider photos={ids(3).map(id => photo(id))} total={9} />);
    const track = layout(3);
    fireEvent.scroll(track);
    fireEvent.scroll(track);
    fireEvent.scroll(track);
    expect(getPage).toHaveBeenCalledTimes(1);
    await act(async () => { finish({ images: ids(3, 3).map(id => photo(id)), total: 9, seed: null }); });
    expect(await screen.findByAltText('Photo 8')).toBeInTheDocument(); // then the next page, in turn
    expect(getPage.mock.calls).toEqual([[3, null], [6, null]]);
  });

  it('keeps working if a reply comes back malformed', async () => {
    getPage.mockResolvedValueOnce(undefined);
    render(<MomentsSlider photos={ids(3).map(id => photo(id))} total={9} />);
    layout(3);
    await act(async () => {});
    expect(within(screen.getByRole('list', { name: 'Moments' })).getAllByRole('listitem')).toHaveLength(3);
  });

  it('tries again on the next scroll after a failed load', async () => {
    getPage
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ images: ids(3, 3).map(id => photo(id)), total: 6, seed: null });
    render(<MomentsSlider photos={ids(3).map(id => photo(id))} total={6} />);
    const track = layout(3);
    await act(async () => {});
    fireEvent.scroll(track);
    expect(await screen.findByAltText('Photo 5')).toBeInTheDocument();
    expect(getPage).toHaveBeenCalledTimes(2);
    expect(getPage).toHaveBeenLastCalledWith(3, null);
  });

  it('keeps the photos it has if loading more fails', async () => {
    getPage.mockRejectedValueOnce(new Error('offline'));
    render(<MomentsSlider photos={ids(3).map(id => photo(id))} total={9} />);
    layout(3);
    await act(async () => {});
    expect(within(screen.getByRole('list', { name: 'Moments' })).getAllByRole('listitem')).toHaveLength(3);
  });
});
