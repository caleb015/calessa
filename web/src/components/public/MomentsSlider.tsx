'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RxChevronLeft, RxChevronRight } from 'react-icons/rx';
import { publicApi } from '@/lib/api';
import { scaledToHeightUrl } from '@/lib/upload';
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
/** How fast the row drifts by itself, in px per second: slow, for looking at the photos as they pass. */
export const DRIFT_PX_PER_S = 24;
/** After someone swipes, drags, scrolls, hovers or presses an arrow, the row waits this long before drifting again. */
export const RESUME_AFTER_MS = 3000;
/** A swipe has come to rest once the row has stopped scrolling for this long. */
const SCROLL_SETTLE_MS = 150;
/** How many of the first photos are repeated after the last, so the row carries straight on into them. */
const LOOP_REPEATS = 12;

/** Eases out with a small overshoot that settles back, so each stop lands with a soft "click". */
function settle(t: number) {
  const s = 0.9;
  return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** A photo's shape (width ÷ height) before it has loaded: a portrait guess, so lazy loading still works. */
const PLACEHOLDER_RATIO = 2 / 3;

/**
 * The homepage's Moments: a sideways row of gallery photos, all the same height, each in its own shape
 * (landscape photos stay landscape) and always shown whole, never cropped or rotated. A very wide photo
 * is scaled down to fit the row. Swipe with a finger (the browser's own scrolling and
 * snapping), drag with a mouse, or use the arrows; every stop lines a photo up with the left edge.
 *
 * The row also drifts slowly by itself, and after the last photo carries straight on to the first again
 * (the first few photos are repeated after the last; once the row reaches the repeat it quietly jumps back
 * to the real ones, which look identical). The moment someone touches, drags, scrolls or hovers over it,
 * the drift stops and the row snaps to photos as usual; a few seconds after they leave it, it drifts again.
 * It holds still while it's off screen, and for people who turn off animations.
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
  // Each photo's shape, learned as it loads (width ÷ height).
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const learnShape = useCallback((id: string, img: HTMLImageElement | null) => {
    if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) return;
    const ratio = img.naturalWidth / img.naturalHeight;
    setRatios(prev => (prev[id] === ratio ? prev : { ...prev, [id]: ratio }));
  }, []);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [dragging, setDragging] = useState(false);
  const glide = useRef<number | null>(null);
  const drag = useRef<{ id: number; startX: number; startLeft: number; samples: { x: number; t: number }[] } | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  // Looping: only once every photo is here and they don't all fit on screen.
  const [overflows, setOverflows] = useState(false);
  const looping = !hasMore && overflows && photos.length > 1;
  const repeats = looping ? photos.slice(0, LOOP_REPEATS) : [];
  // What holds the row still.
  const lastUsed = useRef(-Infinity);
  const hovering = useRef(false);
  const touching = useRef(false);
  const onScreen = useRef(true);
  const settleTimer = useRef<number | null>(null);
  const drifting = useRef(false);
  const driftAt = useRef(0);
  const markUsed = () => { lastUsed.current = performance.now(); };

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
    const last = el.children[photos.length - 1] as HTMLElement | undefined;
    const fits = !last || last.offsetLeft + last.offsetWidth <= el.clientWidth + 1;
    setOverflows(!fits);
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(remaining <= 4 && !hasMore && (fits || photos.length < 2));
    // Fetch the next photos while about two screens are still to go, so the row never runs dry.
    if (hasMore && remaining < el.clientWidth * 2) loadMore();
  }, [hasMore, loadMore, photos.length]);

  // Cards change width as their photos load; recheck the ends.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { updateEnds(); }, [ratios]);

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

  /** Once the row has moved into the repeated first photos, jump back to the real ones (they look the same). */
  const wrapAround = () => {
    const el = track.current;
    const firstRepeat = el?.children[photos.length] as HTMLElement | undefined;
    if (!el || !looping || !firstRepeat || firstRepeat.offsetLeft <= 0) return;
    if (el.scrollLeft < firstRepeat.offsetLeft - 1) return;
    pauseSnap(el);
    el.scrollLeft -= firstRepeat.offsetLeft;
    resumeSnap(el);
  };

  const glideTo = (target: number) => {
    const el = track.current;
    if (!el) return;
    if (glide.current != null) cancelAnimationFrame(glide.current);
    if (prefersReducedMotion()) {
      el.scrollLeft = target;
      resumeSnap(el);
      wrapAround();
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
        wrapAround();
        updateEnds();
      }
    };
    glide.current = requestAnimationFrame(step);
  };

  // Arrows: one photo at a time.
  const move = (direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    takeOver();
    const all = stops();
    const here = all.indexOf(nearestStop(el.scrollLeft));
    glideTo(all[Math.min(all.length - 1, Math.max(0, here + direction))]);
  };

  /** Whether the row may drift by itself right now: not while someone is using it or can't see it. */
  const mayDrift = () => {
    if (document.hidden || !onScreen.current) return false;
    if (hovering.current || touching.current || drag.current || glide.current != null) return false;
    if (performance.now() - lastUsed.current < RESUME_AFTER_MS) return false;
    // Someone moving through the row with the keyboard.
    try { if (wrapper.current?.contains(document.activeElement) && document.activeElement?.matches(':focus-visible')) return false; } catch { /* older browsers */ }
    return true;
  };

  /** Stops drifting; snapping comes back on, so the row settles on a photo as it always has. */
  const stopDrift = () => {
    const el = track.current;
    if (!drifting.current || !el) return;
    drifting.current = false;
    if (glide.current == null && !drag.current) resumeSnap(el);
  };

  /** One frame of drifting: moves the row on a little, carrying on from the last photo into the first. */
  const drift = (ms: number) => {
    const el = track.current;
    if (!el || !mayDrift()) { stopDrift(); return; }
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) return; // every photo already fits on screen
    if (!drifting.current) {
      drifting.current = true;
      driftAt.current = el.scrollLeft;
      pauseSnap(el);
    }
    // Browsers round scrollLeft, so keep the exact position here (and follow the row if it moved meanwhile).
    if (Math.abs(el.scrollLeft - driftAt.current) > 2) driftAt.current = el.scrollLeft;
    let next = driftAt.current + (DRIFT_PX_PER_S * ms) / 1000;
    const firstRepeat = el.children[photos.length] as HTMLElement | undefined;
    if (looping && firstRepeat && firstRepeat.offsetLeft > 0 && next >= firstRepeat.offsetLeft) next -= firstRepeat.offsetLeft;
    driftAt.current = Math.min(next, max); // at the end of what's loaded: wait for more
    el.scrollLeft = driftAt.current;
  };
  const driftRef = useRef(drift);
  useEffect(() => { driftRef.current = drift; });

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      driftRef.current(Math.min(100, Math.max(0, now - last))); // a long gap (a background tab) is no jump
      last = now;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);

  /** Someone has taken hold of the row: stop drifting at once. */
  const takeOver = () => {
    markUsed();
    stopDrift();
  };

  // Hold still while the row is off screen.
  useEffect(() => {
    const el = wrapper.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => { onScreen.current = entry.isIntersecting; });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => { if (settleTimer.current != null) window.clearTimeout(settleTimer.current); }, []);

  const onScroll = () => {
    updateEnds();
    // A swipe or scroll that came to rest in the repeated photos: jump back to the real ones.
    if (!looping || drifting.current || glide.current != null || drag.current) return;
    if (settleTimer.current != null) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      settleTimer.current = null;
      if (!touching.current && !drag.current && glide.current == null) wrapAround();
    }, SCROLL_SETTLE_MS);
  };

  // Mouse dragging (fingers use the browser's own swipe, which already snaps).
  const onPointerDown = (e: React.PointerEvent<HTMLUListElement>) => {
    takeOver();
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
    markUsed();
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

  const card = (photo: GalleryImage, repeat = false) => (
    <li
      key={repeat ? `repeat-${photo.id}` : photo.id}
      // The repeated first photos are only there for the loop: hidden from screen readers.
      aria-hidden={repeat || undefined}
      data-repeat={repeat || undefined}
      data-ratio={ratios[photo.id] ?? undefined}
      // Same height for every photo; the width follows the photo's own shape (capped to the row).
      style={{ aspectRatio: String(ratios[photo.id] ?? PLACEHOLDER_RATIO) }}
      className="snap-start shrink-0 h-[350px] sm:h-[370px] max-w-full overflow-hidden bg-[var(--surface)]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={img => learnShape(photo.id, img)}
        onLoad={e => learnShape(photo.id, e.currentTarget)}
        src={scaledToHeightUrl(photo.imageUrl, 800)}
        srcSet={`${scaledToHeightUrl(photo.imageUrl, 400)} 1x, ${scaledToHeightUrl(photo.imageUrl, 800)} 2x`}
        alt={repeat ? '' : photo.title ?? (photo.sharedBy ? `Photo shared by ${photo.sharedBy}` : 'Wedding moment')}
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
        // Whole photo, never cropped: a photo wider than the row is scaled down inside its card.
        className="w-full h-full object-contain pointer-events-none"
      />
    </li>
  );

  return (
    <div
      ref={wrapper}
      className="relative"
      onPointerEnter={e => {
        if (e.pointerType !== 'mouse') return;
        hovering.current = true;
        // Settle on the nearest photo, as if the row had been let go there.
        if (drifting.current && track.current) { stopDrift(); glideTo(nearestStop(track.current.scrollLeft)); }
      }}
      onPointerLeave={e => { if (e.pointerType === 'mouse') { hovering.current = false; markUsed(); } }}
    >
      <ul
        ref={track}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onTouchStart={() => { touching.current = true; takeOver(); }}
        onTouchEnd={() => { touching.current = false; markUsed(); }}
        onTouchCancel={() => { touching.current = false; }}
        onWheel={e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) takeOver(); }}
        aria-label="Moments"
        className={`relative flex gap-3 overflow-x-auto snap-x snap-mandatory overscroll-x-contain select-none pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          dragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {photos.map(photo => card(photo))}
        {repeats.map(photo => card(photo, true))}
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
