'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RxChevronLeft, RxChevronRight } from 'react-icons/rx';
import { publicApi } from '@/lib/api';
import { croppedUrl } from '@/lib/upload';
import type { GalleryImage } from '@/types/api';

/** How far a flick carries on after letting go, in ms of the release speed. */
const FLICK_CARRY_MS = 260;
/** Release speed is measured over this last stretch of the drag, so a pause before letting go means no flick. */
const FLICK_WINDOW_MS = 100;
/** Fastest release speed counted (px per ms): about a brisk hand flick. */
const MAX_FLICK_SPEED = 2.5;
/** A flick carries on at most this share of the visible row. */
const MAX_FLICK_CARRY = 0.75;
/** Glide-to-rest timing, scaled by distance. */
const MIN_GLIDE_MS = 320;
const MAX_GLIDE_MS = 720;

/** Eases out with a small overshoot that settles back, so each stop lands with a soft "click". */
function settle(t: number) {
  const s = 0.9;
  return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The homepage's Moments: a sideways row of gallery photos, all in the same 2:3 portrait frame. Photos are
 * cropped to fit the frame (never rotated). Swipe with a finger (the browser's own scrolling and
 * snapping), drag with a mouse, or use the arrows; every stop lines a photo up with the left edge.
 *
 * There can be hundreds of photos, so only the first page comes with the page; more are fetched as the
 * row nears its end (`seed` keeps a random order the same from page to page). Photos load lazily, in a
 * size to suit the screen.
 */
export default function MomentsSlider({ photos: firstPage, total = firstPage.length, seed = null }: {
  photos: GalleryImage[];
  total?: number;
  seed?: number | null;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [photos, setPhotos] = useState(firstPage);
  const [knownTotal, setKnownTotal] = useState(total);
  const fetching = useRef(false);
  const hasMore = photos.length < knownTotal;
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [dragging, setDragging] = useState(false);
  const glide = useRef<number | null>(null);
  const drag = useRef<{ id: number; startX: number; startLeft: number; samples: { x: number; t: number }[] } | null>(null);

  const loadMore = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const page = await publicApi.getHomepageGallery(photos.length, seed);
      const incoming = page.images; // read here, so an unexpected reply is caught below
      setPhotos(prev => {
        const seen = new Set(prev.map(p => p.id));
        // Skip anything already shown (or repeated within the page), so no photo appears twice.
        return [...prev, ...incoming.filter(p => !seen.has(p.id) && seen.add(p.id))];
      });
      // An empty page means photos were removed meanwhile: stop asking.
      setKnownTotal(incoming.length === 0 ? photos.length : page.total);
    } catch {
      // Keep what's shown; the next scroll tries again.
    } finally {
      fetching.current = false;
    }
  }, [photos.length, seed]);

  const updateEnds = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const remaining = el.scrollWidth - (el.scrollLeft + el.clientWidth);
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(remaining <= 4 && !hasMore);
    // Fetch the next photos while about two screens are still to go, so the row never runs dry.
    if (hasMore && remaining < el.clientWidth * 2) loadMore();
  }, [hasMore, loadMore]);

  useEffect(() => {
    updateEnds();
    window.addEventListener('resize', updateEnds);
    return () => {
      window.removeEventListener('resize', updateEnds);
      if (glide.current != null) cancelAnimationFrame(glide.current);
    };
  }, [updateEnds, photos.length]);

  /** Where the row can come to rest: each photo's left edge (the last ones stop at the end of the row). */
  const stops = () => {
    const el = track.current;
    if (!el) return [0];
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    return [...new Set(Array.from(el.children, li => Math.min((li as HTMLElement).offsetLeft, max)))].sort((a, b) => a - b);
  };
  const nearestStop = (left: number) => stops().reduce((best, s) => (Math.abs(s - left) < Math.abs(best - left) ? s : best), 0);

  // While we move the row ourselves, CSS snapping is paused so it doesn't fight the motion.
  const pauseSnap = (el: HTMLElement) => { el.style.scrollSnapType = 'none'; };
  const resumeSnap = (el: HTMLElement) => { el.style.scrollSnapType = ''; };

  const glideTo = (target: number) => {
    const el = track.current;
    if (!el) return;
    if (glide.current != null) cancelAnimationFrame(glide.current);
    if (prefersReducedMotion()) {
      el.scrollLeft = target;
      resumeSnap(el);
      updateEnds();
      return;
    }
    pauseSnap(el);
    const from = el.scrollLeft;
    const distance = target - from;
    const duration = Math.min(MAX_GLIDE_MS, Math.max(MIN_GLIDE_MS, Math.abs(distance) * 0.9));
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      el.scrollLeft = from + distance * settle(t);
      if (t < 1) glide.current = requestAnimationFrame(step);
      else {
        el.scrollLeft = target;
        glide.current = null;
        resumeSnap(el);
        updateEnds();
      }
    };
    glide.current = requestAnimationFrame(step);
  };

  // Arrows: one photo at a time.
  const move = (direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const all = stops();
    const here = all.indexOf(nearestStop(el.scrollLeft));
    glideTo(all[Math.min(all.length - 1, Math.max(0, here + direction))]);
  };

  // Mouse dragging (fingers use the browser's own swipe, which already snaps).
  const onPointerDown = (e: React.PointerEvent<HTMLUListElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const el = e.currentTarget;
    if (glide.current != null) cancelAnimationFrame(glide.current);
    pauseSnap(el);
    drag.current = { id: e.pointerId, startX: e.clientX, startLeft: el.scrollLeft, samples: [{ x: e.clientX, t: performance.now() }] };
    el.setPointerCapture?.(e.pointerId);
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLUListElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const el = e.currentTarget;
    el.scrollLeft = d.startLeft - (e.clientX - d.startX);
    const now = performance.now();
    d.samples.push({ x: e.clientX, t: now });
    d.samples = d.samples.filter(s => now - s.t <= FLICK_WINDOW_MS * 2);
  };

  /** Mouse speed (px per ms) over the last moments before letting go; 0 after a pause. */
  const releaseSpeed = (samples: { x: number; t: number }[]) => {
    const now = performance.now();
    const recent = samples.filter(s => now - s.t <= FLICK_WINDOW_MS);
    if (recent.length < 2) return 0;
    const first = recent[0];
    const last = recent[recent.length - 1];
    return (last.x - first.x) / Math.max(1, last.t - first.t);
  };
  const endDrag = (e: React.PointerEvent<HTMLUListElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    setDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    // A flick carries on a little before settling on the nearest photo.
    const el = e.currentTarget;
    const speed = Math.max(-MAX_FLICK_SPEED, Math.min(MAX_FLICK_SPEED, releaseSpeed(d.samples)));
    const maxCarry = el.clientWidth * MAX_FLICK_CARRY;
    const carry = Math.max(-maxCarry, Math.min(maxCarry, speed * FLICK_CARRY_MS));
    glideTo(nearestStop(el.scrollLeft - carry));
  };

  const arrow = 'hidden sm:flex absolute top-1/2 -translate-y-1/2 z-10 w-11 h-11 items-center justify-center rounded-full bg-[var(--background)]/90 text-[var(--foreground)] shadow-md hover:text-[var(--accent)] disabled:opacity-0 disabled:pointer-events-none transition-opacity';

  return (
    <div className="relative">
      <ul
        ref={track}
        onScroll={updateEnds}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        aria-label="Moments"
        className={`relative flex gap-3 overflow-x-auto snap-x snap-mandatory overscroll-x-contain select-none pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          dragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {photos.map(photo => (
          <li
            key={photo.id}
            className="snap-start shrink-0 w-[68%] sm:w-[38%] lg:w-[calc((100%-2.25rem)/4)] aspect-[2/3] overflow-hidden bg-[var(--surface)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={croppedUrl(photo.imageUrl, 800, 1200)}
              srcSet={`${croppedUrl(photo.imageUrl, 500, 750)} 500w, ${croppedUrl(photo.imageUrl, 800, 1200)} 800w`}
              sizes="(min-width: 1024px) 250px, (min-width: 640px) 38vw, 68vw"
              alt={photo.title ?? (photo.sharedBy ? `Photo shared by ${photo.sharedBy}` : 'Wedding moment')}
              loading="lazy"
              decoding="async"
              draggable={false}
              // Very large animations can't be resized on the free plan; fall back to the original.
              onError={e => {
                if (e.currentTarget.src !== photo.imageUrl) {
                  e.currentTarget.srcset = '';
                  e.currentTarget.src = photo.imageUrl;
                }
              }}
              className="w-full h-full object-cover pointer-events-none"
            />
          </li>
        ))}
      </ul>
      {photos.length > 1 && (
        <>
          <button type="button" onClick={() => move(-1)} disabled={atStart} aria-label="Previous photos" className={`${arrow} -left-3 md:-left-5`}>
            <RxChevronLeft size={22} />
          </button>
          <button type="button" onClick={() => move(1)} disabled={atEnd} aria-label="Next photos" className={`${arrow} -right-3 md:-right-5`}>
            <RxChevronRight size={22} />
          </button>
        </>
      )}
    </div>
  );
}
