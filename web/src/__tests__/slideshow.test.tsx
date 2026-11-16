import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { SlideshowQueue } from '@/lib/slideshow';
import SlideshowPage from '@/app/dashboard/slideshow/page';
import { adminApi } from '@/lib/adminApi';

jest.mock('@/lib/adminApi', () => ({ adminApi: { getGallery: jest.fn() } }));
const getGallery = adminApi.getGallery as jest.Mock;

const slide = (id: string, createdAt = '2026-01-01') => ({ id, imageUrl: `https://x/${id}.jpg`, createdAt });
const ids = (q: SlideshowQueue, n: number) => Array.from({ length: n }, () => q.next()?.id);

describe('SlideshowQueue', () => {
  it('shows every photo once per round, in random order, never twice in a row', () => {
    const q = new SlideshowQueue();
    q.update(['a', 'b', 'c', 'd'].map(id => slide(id)));
    let previous: string | undefined;
    for (let round = 0; round < 25; round++) {
      const shown = ids(q, 4);
      expect([...shown].sort()).toEqual(['a', 'b', 'c', 'd']);
      expect(shown[0]).not.toBe(previous);
      previous = shown[3];
    }
  });

  it('shows newly added photos next, oldest first, then mixes them into the pool', () => {
    const q = new SlideshowQueue();
    q.update([slide('a'), slide('b')]);
    q.next();
    q.update([slide('a'), slide('b'), slide('new2', '2026-03-02'), slide('new1', '2026-03-01')]);
    expect(q.queued).toBe(2);
    expect(ids(q, 2)).toEqual(['new1', 'new2']);
    expect(q.queued).toBe(0);

    // Afterwards everything, including the new photos, comes up in the random rounds.
    const later = new Set(ids(q, 20));
    expect(later).toEqual(new Set(['a', 'b', 'new1', 'new2']));
  });

  it('does not queue the photos it starts with', () => {
    const q = new SlideshowQueue();
    q.update([slide('a'), slide('b')]);
    expect(q.queued).toBe(0);
  });

  it('drops deleted or unpublished photos, including queued ones', () => {
    const q = new SlideshowQueue();
    q.update([slide('a'), slide('b')]);
    q.update([slide('a'), slide('b'), slide('new')]);
    q.update([slide('a')]);
    expect(q.queued).toBe(0);
    expect(new Set(ids(q, 6))).toEqual(new Set(['a']));
  });

  it('has nothing to show for an empty gallery', () => {
    const q = new SlideshowQueue();
    q.update([]);
    expect(q.next()).toBeNull();
  });
});

describe('Slideshow page', () => {
  const row = (id: string, extra: Partial<{ isPublished: boolean; guest: { primaryName: string } | null; title: string | null }> = {}) => ({
    id, imageUrl: `https://x/${id}.jpg`, title: null, isPublished: true, guest: null, createdAt: `2026-01-01T00:00:0${id.length}Z`, ...extra,
  });
  const shownPhoto = () => screen.getAllByRole('img').filter(i => i.getAttribute('aria-hidden') !== 'true').pop() as HTMLImageElement;

  beforeAll(() => {
    // jsdom doesn't download images; make every preload succeed straight away.
    (global as unknown as { Image: unknown }).Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(url: string) {
        setTimeout(() => (url.includes('broken') ? this.onerror?.() : this.onload?.()), 0);
      }
    };
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });
  afterEach(() => jest.useRealTimers());

  const settle = async () => { for (let i = 0; i < 5; i++) await act(async () => { await jest.advanceTimersByTimeAsync(10); }); };

  it('shows only published photos, whole and with who shared them', async () => {
    getGallery.mockResolvedValue([row('a', { guest: { primaryName: 'Maria Santos' } }), row('hidden', { isPublished: false })]);
    render(<SlideshowPage />);
    await settle();
    expect(shownPhoto()).toHaveAttribute('src', 'https://x/a.jpg');
    expect(shownPhoto()).toHaveClass('object-contain');
    expect(screen.getByText('Shared by Maria Santos')).toBeInTheDocument();
    expect(screen.getByText('1 photo')).toBeInTheDocument();
  });

  it('moves to the next photo after the chosen time, and pauses', async () => {
    getGallery.mockResolvedValue([row('a'), row('bb')]);
    render(<SlideshowPage />);
    await settle();
    const first = shownPhoto().getAttribute('src');

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '5' } });
    await act(async () => { await jest.advanceTimersByTimeAsync(5000); });
    await settle(); // the next photo loads
    const second = shownPhoto().getAttribute('src');
    expect(second).not.toBe(first);

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await act(async () => { await jest.advanceTimersByTimeAsync(20_000); });
    expect(shownPhoto().getAttribute('src')).toBe(second);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await settle();
    expect(shownPhoto().getAttribute('src')).toBe(first);
  });

  it('shows a newly uploaded photo next', async () => {
    getGallery.mockResolvedValue([row('a'), row('bb')]);
    render(<SlideshowPage />);
    await settle();

    getGallery.mockResolvedValue([row('a'), row('bb'), row('fresh')]);
    await act(async () => { await jest.advanceTimersByTimeAsync(30_000); }); // gallery re-check
    expect(screen.getByText(/1 new up next/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    await settle();
    expect(shownPhoto()).toHaveAttribute('src', 'https://x/fresh.jpg');
  });

  it('takes a photo off screen as soon as it is unpublished', async () => {
    getGallery.mockResolvedValue([row('a', { title: 'Beach' })]);
    render(<SlideshowPage />);
    await settle();
    expect(screen.getByText('Beach')).toBeInTheDocument();

    getGallery.mockResolvedValue([row('a', { isPublished: false })]);
    await act(async () => { await jest.advanceTimersByTimeAsync(30_000); });
    expect(screen.queryByText('Beach')).not.toBeInTheDocument();
    expect(screen.getByText(/No published gallery photos yet/)).toBeInTheDocument();
  });

  it('skips photos that fail to load', async () => {
    getGallery.mockResolvedValue([row('broken')]);
    render(<SlideshowPage />);
    await settle();
    expect(screen.queryAllByRole('img')).toHaveLength(0);

    getGallery.mockResolvedValue([row('broken'), row('ok')]);
    await act(async () => { await jest.advanceTimersByTimeAsync(30_000); });
    await settle();
    expect(shownPhoto()).toHaveAttribute('src', 'https://x/ok.jpg');
  });

  it('crossfades: the new photo fades in over the old one, which is removed afterwards', async () => {
    getGallery.mockResolvedValue([row('a'), row('bb')]);
    render(<SlideshowPage />);
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    await settle();
    const layers = () => screen.getAllByRole('img', { hidden: true }).filter(i => i.classList.contains('slide-photo'));
    expect(layers()).toHaveLength(2);
    const incoming = layers()[1].closest('.absolute.inset-0.bg-neutral-950') as HTMLElement;
    expect(incoming.style.animation).toMatch(/slideFadeIn/);

    // Motion/caption animations finishing inside the layer don't count as the fade finishing.
    fireEvent.animationEnd(layers()[1]);
    expect(layers()).toHaveLength(2);
    fireEvent.animationEnd(incoming);
    expect(layers()).toHaveLength(1);
  });

  it('explains an empty gallery', async () => {
    getGallery.mockResolvedValue([]);
    render(<SlideshowPage />);
    await settle();
    expect(screen.getByText(/No published gallery photos yet/)).toBeInTheDocument();
  });
});

