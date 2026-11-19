import { act, fireEvent, render, screen, within } from '@testing-library/react';
import MomentsSlider, { DRIFT_PX_PER_S, RESUME_AFTER_MS } from '@/components/public/MomentsSlider';
import { publicApi } from '@/lib/api';
import type { GalleryImage } from '@/types/api';

jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), publicApi: { getHomepageGallery: jest.fn() } }));
const getPage = publicApi.getHomepageGallery as jest.Mock;

const CLD = (id: string, ext = 'jpg') => `https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_2400/v1/calessa/${id}.${ext}`;
const photo = (id: string, ext = 'jpg'): GalleryImage => ({ id, title: `Photo ${id}`, description: null, imageUrl: CLD(id, ext), displayOrder: 0, sharedBy: null });
const six = () => ['a', 'b', 'c', 'd', 'e', 'f'].map(id => photo(id));

const CARD = 250; // card width + gap, in px
/**
 * jsdom has no layout: give the row a width, every card (repeats included) its position, and a real
 * scrollLeft (clamped like a browser's).
 */
function layout(clientWidth = 1000) {
  const track = screen.getByRole('list', { name: 'Moments' });
  const scrollWidth = () => track.querySelectorAll('li').length * CARD;
  let left = 0;
  Object.defineProperty(HTMLLIElement.prototype, 'offsetLeft', {
    configurable: true,
    get(this: HTMLLIElement) { return Array.prototype.indexOf.call(this.parentElement?.children ?? [], this) * CARD; },
  });
  Object.defineProperty(HTMLLIElement.prototype, 'offsetWidth', { configurable: true, get: () => CARD });
  Object.defineProperty(track, 'clientWidth', { configurable: true, value: clientWidth });
  Object.defineProperty(track, 'scrollWidth', { configurable: true, get: scrollWidth });
  Object.defineProperty(track, 'scrollLeft', {
    configurable: true,
    get: () => left,
    set: (v: number) => { left = Math.max(0, Math.min(scrollWidth() - clientWidth, v)); },
  });
  fireEvent.scroll(track);
  return track;
}
afterEach(() => {
  delete (HTMLLIElement.prototype as unknown as Record<string, unknown>).offsetLeft;
  delete (HTMLLIElement.prototype as unknown as Record<string, unknown>).offsetWidth;
});

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
  it('shows every photo at the same height, never cropped or rotated', () => {
    render(<MomentsSlider photos={Array.from({ length: 12 }, (_, i) => photo(String(i)))} />);
    const items = within(screen.getByRole('list', { name: 'Moments' })).getAllByRole('listitem');
    expect(items).toHaveLength(12);
    items.forEach(li => expect(li).toHaveClass('h-[350px]', 'sm:h-[370px]', 'max-w-full', 'snap-start'));
    const img = screen.getByAltText('Photo 0');
    expect(img).toHaveAttribute('src', expect.stringContaining('/f_auto,q_auto,c_limit,h_800/')); // scaled, not cropped
    expect(img.getAttribute('src')).not.toMatch(/c_fill/);
    expect(img).toHaveAttribute('srcset', expect.stringContaining('c_limit,h_400/'));
    expect(img).toHaveClass('object-contain');
    expect(img.getAttribute('style') ?? '').not.toMatch(/rotate/);
  });

  /** Pretends the photo finished loading at the given size. */
  function load(img: HTMLElement, width: number, height: number) {
    Object.defineProperty(img, 'naturalWidth', { configurable: true, value: width });
    Object.defineProperty(img, 'naturalHeight', { configurable: true, value: height });
    Object.defineProperty(img, 'complete', { configurable: true, value: true });
    fireEvent.load(img);
  }

  it('gives each photo a card in its own shape once it loads: landscape stays landscape', () => {
    render(<MomentsSlider photos={[photo('wide'), photo('tall'), photo('square')]} />);
    const card = (id: string) => screen.getByAltText(`Photo ${id}`).closest('li')!;
    // Before loading, a portrait placeholder keeps the row laid out (and lazy loading working).
    expect(card('wide').style.aspectRatio).toBe(String(2 / 3));

    load(screen.getByAltText('Photo wide'), 1600, 1000);
    load(screen.getByAltText('Photo tall'), 1000, 1500);
    load(screen.getByAltText('Photo square'), 900, 900);
    expect(card('wide').style.aspectRatio).toBe('1.6');
    expect(card('tall').style.aspectRatio).toBe(String(1000 / 1500));
    expect(card('square').style.aspectRatio).toBe('1');
  });

  it('learns the shape of photos that loaded before the page was ready', () => {
    const cached = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'complete');
    Object.defineProperty(HTMLImageElement.prototype, 'complete', { configurable: true, get: () => true });
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', { configurable: true, get: () => 1200 });
    Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', { configurable: true, get: () => 800 });
    try {
      render(<MomentsSlider photos={[photo('cached')]} />);
      expect(screen.getByAltText('Photo cached').closest('li')!.style.aspectRatio).toBe('1.5');
    } finally {
      if (cached) Object.defineProperty(HTMLImageElement.prototype, 'complete', cached);
      delete (HTMLImageElement.prototype as unknown as Record<string, unknown>).naturalWidth;
      delete (HTMLImageElement.prototype as unknown as Record<string, unknown>).naturalHeight;
    }
  });

  it('snaps to a photo when swiped with a finger (the browser\'s own scrolling)', () => {
    render(<MomentsSlider photos={six()} />);
    expect(screen.getByRole('list', { name: 'Moments' })).toHaveClass('overflow-x-auto', 'snap-x', 'snap-mandatory');
  });

  it('shows GIFs as stills, scaled to the same height', () => {
    render(<MomentsSlider photos={[photo('party', 'gif')]} />);
    expect(screen.getByAltText('Photo party')).toHaveAttribute('src', expect.stringContaining('/pg_10/f_jpg,q_auto,c_limit,h_800/'));
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
    const track = layout();
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

  it('loads copies sized to the card (sharper on high-resolution screens), lazily', () => {
    render(<MomentsSlider photos={[photo('a')]} />);
    const img = screen.getByAltText('Photo a');
    expect(img).toHaveAttribute('srcset', expect.stringMatching(/c_limit,h_400\/.* 1x, .*c_limit,h_800\/.* 2x/));
    expect(img).toHaveAttribute('loading', 'lazy');
  });
});

describe('Moments slider with many photos', () => {
  const ids = (n: number, from = 0) => Array.from({ length: n }, (_, i) => String(from + i));
  beforeEach(() => getPage.mockReset());

  it('fetches the next photos as the row nears its end, keeping the same shuffle', async () => {
    getPage.mockResolvedValueOnce({ images: ids(4, 4).map(id => photo(id)), total: 10, seed: 55 });
    render(<MomentsSlider photos={ids(4).map(id => photo(id))} total={10} seed={55} />);
    layout(); // the whole first page fits on screen: the end is near
    expect(getPage).toHaveBeenCalledWith(4, 55);
    expect(await screen.findByAltText('Photo 7')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Moments' })).getAllByRole('listitem')).toHaveLength(8);
  });

  it('keeps the next arrow while more photos are still to come', () => {
    getPage.mockReturnValue(new Promise(() => {})); // still loading
    render(<MomentsSlider photos={ids(6).map(id => photo(id))} total={20} />);
    const track = layout();
    track.scrollLeft = 500; // at the end of what's loaded
    fireEvent.scroll(track);
    expect(screen.getByRole('button', { name: 'Next photos' })).toBeEnabled();
  });

  it('stops asking once every photo is shown, and never shows one twice', async () => {
    getPage.mockResolvedValueOnce({ images: [...ids(2, 3), '4', '5'].map(id => photo(id)), total: 6, seed: null }); // '4' arrives twice
    render(<MomentsSlider photos={ids(3).map(id => photo(id))} total={6} />);
    layout();
    await screen.findByAltText('Photo 5');
    const items = within(screen.getByRole('list', { name: 'Moments' })).getAllByRole('listitem');
    expect(items).toHaveLength(6);
    fireEvent.scroll(screen.getByRole('list', { name: 'Moments' }));
    expect(getPage).toHaveBeenCalledTimes(1);
  });

  it('does not ask for more when every photo came with the page', () => {
    render(<MomentsSlider photos={ids(5).map(id => photo(id))} total={5} />);
    layout();
    expect(getPage).not.toHaveBeenCalled();
  });

  it('asks for one page at a time, however much the row is scrolled meanwhile', async () => {
    let finish: (v: unknown) => void = () => {};
    getPage
      .mockReturnValueOnce(new Promise(r => { finish = r; }))
      .mockResolvedValueOnce({ images: ids(3, 6).map(id => photo(id)), total: 9, seed: null });
    render(<MomentsSlider photos={ids(3).map(id => photo(id))} total={9} />);
    const track = layout();
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
    layout();
    await act(async () => {});
    expect(within(screen.getByRole('list', { name: 'Moments' })).getAllByRole('listitem')).toHaveLength(3);
  });

  it('tries again on the next scroll after a failed load', async () => {
    getPage
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ images: ids(3, 3).map(id => photo(id)), total: 6, seed: null });
    render(<MomentsSlider photos={ids(3).map(id => photo(id))} total={6} />);
    const track = layout();
    await act(async () => {});
    fireEvent.scroll(track);
    expect(await screen.findByAltText('Photo 5')).toBeInTheDocument();
    expect(getPage).toHaveBeenCalledTimes(2);
    expect(getPage).toHaveBeenLastCalledWith(3, null);
  });

  it('keeps the photos it has if loading more fails', async () => {
    getPage.mockRejectedValueOnce(new Error('offline'));
    render(<MomentsSlider photos={ids(3).map(id => photo(id))} total={9} />);
    layout();
    await act(async () => {});
    expect(within(screen.getByRole('list', { name: 'Moments' })).getAllByRole('listitem')).toHaveLength(3);
  });
});

describe('Moments slider drifting by itself, and looping', () => {
  const tick = async (ms: number) => { await act(async () => { jest.advanceTimersByTime(ms); }); };
  const perSecond = DRIFT_PX_PER_S;
  const repeats = () => screen.getByRole('list', { name: 'Moments' }).querySelectorAll('li[data-repeat]');
  beforeEach(() => jest.useFakeTimers());

  it('drifts slowly and smoothly, with snapping off while it drifts', async () => {
    render(<MomentsSlider photos={six()} />);
    const track = layout();
    await tick(1000);
    expect(track.scrollLeft).toBeGreaterThan(perSecond * 0.8);
    expect(track.scrollLeft).toBeLessThan(perSecond * 1.2);
    expect(track.style.scrollSnapType).toBe('none');
    const before = track.scrollLeft;
    await tick(100);
    expect(track.scrollLeft).toBeGreaterThan(before); // a little every frame, not a photo at a time
    expect(track.scrollLeft - before).toBeLessThan(perSecond * 0.2);
  });

  it('carries on from the last photo into the first, without rewinding', async () => {
    render(<MomentsSlider photos={six()} />);
    const track = layout();
    // The first photos are repeated after the last, so the row can carry straight on into them.
    expect(repeats()).toHaveLength(6);
    track.scrollLeft = 6 * CARD - 10; // just before the repeat of the first photo
    const watch = jest.spyOn(track, 'scrollLeft', 'set');
    await tick(1000);
    const moves = watch.mock.calls.map(([v]) => v as number);
    const back = moves.findIndex((v, i) => i > 0 && v < moves[i - 1]);
    expect(moves.slice(0, back).every(v => v >= 6 * CARD - 10)).toBe(true); // forward only, up to the repeat...
    expect(track.scrollLeft).toBeGreaterThan(0); // ...then on from the real first photo, which looks the same
    expect(track.scrollLeft).toBeLessThan(perSecond);
  });

  it('keeps the repeated photos away from screen readers', () => {
    render(<MomentsSlider photos={six()} />);
    layout();
    repeats().forEach(li => {
      expect(li).toHaveAttribute('aria-hidden', 'true');
      expect(li.querySelector('img')).toHaveAttribute('alt', '');
    });
    expect(within(screen.getByRole('list', { name: 'Moments' })).getAllByRole('listitem')).toHaveLength(6);
  });

  it('stops the moment a finger touches it, handing back to snapping, and drifts again a few seconds after', async () => {
    render(<MomentsSlider photos={six()} />);
    const track = layout();
    await tick(1000);
    fireEvent.touchStart(track);
    expect(track.style.scrollSnapType).toBe(''); // the swipe snaps as usual
    const held = track.scrollLeft;
    await tick(2000);
    expect(track.scrollLeft).toBe(held);
    fireEvent.touchEnd(track);
    await tick(RESUME_AFTER_MS - 500);
    expect(track.scrollLeft).toBe(held);
    await tick(1500);
    expect(track.scrollLeft).toBeGreaterThan(held);
  });

  it('settles on the nearest photo while the mouse is over it, and drifts on after it leaves', async () => {
    render(<MomentsSlider photos={six()} />);
    const track = layout();
    await tick(2000);
    const row = track.parentElement!;
    fireEvent.pointerEnter(row, { pointerType: 'mouse' });
    await tick(1000);
    expect(track.scrollLeft).toBe(0); // about 50px in: back to the first photo
    expect(track.style.scrollSnapType).toBe('');
    await tick(5000);
    expect(track.scrollLeft).toBe(0);
    fireEvent.pointerLeave(row, { pointerType: 'mouse' });
    await tick(RESUME_AFTER_MS + 1000);
    expect(track.scrollLeft).toBeGreaterThan(0);
  });

  it('snaps to a photo with the arrows, mid-drift', async () => {
    render(<MomentsSlider photos={six()} />);
    const track = layout();
    await tick(2000);
    fireEvent.click(screen.getByRole('button', { name: 'Next photos' }));
    await tick(1000);
    expect(track.scrollLeft).toBe(CARD);
  });

  it('snaps to a photo when dragged with a mouse, mid-drift', async () => {
    render(<MomentsSlider photos={six()} />);
    const track = layout();
    await tick(2000);
    fireEvent.pointerDown(track, mouse(600));
    fireEvent.pointerMove(track, mouse(400));
    await tick(500);
    fireEvent.pointerMove(track, mouse(400));
    fireEvent.pointerUp(track, mouse(400));
    await tick(1000);
    expect(track.scrollLeft % CARD).toBe(0);
  });

  it('stops for sideways trackpad scrolling, but not for scrolling down the page', async () => {
    render(<MomentsSlider photos={six()} />);
    const track = layout();
    fireEvent.wheel(track, { deltaY: 100 });
    await tick(1000);
    const drifted = track.scrollLeft;
    expect(drifted).toBeGreaterThan(0);
    fireEvent.wheel(track, { deltaX: 100 });
    await tick(1000);
    expect(track.scrollLeft).toBe(drifted);
  });

  it('lets the Next arrow carry on to the first photo too', async () => {
    reducedMotion(true); // no drifting, so only the arrow moves it
    render(<MomentsSlider photos={six()} />);
    const track = layout();
    for (let i = 0; i < 6; i++) {
      expect(screen.getByRole('button', { name: 'Next photos' })).toBeEnabled();
      fireEvent.click(screen.getByRole('button', { name: 'Next photos' }));
    }
    expect(track.scrollLeft).toBe(0);
  });

  it('brings a swipe that comes to rest in the repeated photos back to the real ones', async () => {
    render(<MomentsSlider photos={six()} />);
    const track = layout();
    fireEvent.touchStart(track);
    track.scrollLeft = 7 * CARD; // the repeat of the second photo
    fireEvent.scroll(track);
    await tick(500);
    expect(track.scrollLeft).toBe(7 * CARD); // not while the finger is still down
    fireEvent.touchEnd(track);
    fireEvent.scroll(track); // the swipe's last movement
    await tick(500);
    expect(track.scrollLeft).toBe(CARD);
  });

  it('stays still for people who turn off animations', async () => {
    reducedMotion(true);
    render(<MomentsSlider photos={six()} />);
    const track = layout();
    await tick(5000);
    expect(track.scrollLeft).toBe(0);
  });

  it('stays still while the tab is in the background', async () => {
    const hidden = jest.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    try {
      render(<MomentsSlider photos={six()} />);
      const track = layout();
      await tick(5000);
      expect(track.scrollLeft).toBe(0);
    } finally {
      hidden.mockRestore();
    }
  });

  it('stays still while scrolled out of view', async () => {
    let report: IntersectionObserverCallback = () => {};
    (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
      constructor(cb: IntersectionObserverCallback) { report = cb; }
      observe() {}
      disconnect() {}
    };
    try {
      render(<MomentsSlider photos={six()} />);
      const track = layout();
      act(() => report([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
      await tick(3000);
      expect(track.scrollLeft).toBe(0);
      act(() => report([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
      await tick(1000);
      expect(track.scrollLeft).toBeGreaterThan(0);
    } finally {
      delete (global as unknown as { IntersectionObserver?: unknown }).IntersectionObserver;
    }
  });

  it('neither moves nor repeats photos when they all fit on screen', async () => {
    render(<MomentsSlider photos={six().slice(0, 3)} />);
    const track = layout();
    expect(repeats()).toHaveLength(0);
    await tick(3000);
    expect(track.scrollLeft).toBe(0);
  });

  it('waits at the end of what has loaded while more photos are on their way, and only loops once all are here', async () => {
    getPage.mockReset();
    getPage.mockReturnValue(new Promise(() => {})); // still loading
    render(<MomentsSlider photos={six()} total={8} />);
    const track = layout();
    expect(repeats()).toHaveLength(0);
    track.scrollLeft = 500 - 5;
    await tick(2000);
    expect(track.scrollLeft).toBe(500); // the end of the row so far: no wrapping back
  });

  it('loops once the last photos arrive', async () => {
    getPage.mockReset();
    getPage.mockResolvedValueOnce({ images: ['g', 'h'].map(id => photo(id)), total: 8, seed: null });
    render(<MomentsSlider photos={six()} total={8} />);
    const track = layout();
    expect(await screen.findByAltText('Photo h')).toBeInTheDocument();
    fireEvent.scroll(track);
    expect(repeats()).toHaveLength(8);
  });
});
