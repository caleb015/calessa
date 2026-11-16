'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RxEnterFullScreen, RxPause, RxPlay, RxTrackNext } from 'react-icons/rx';
import { adminApi } from '@/lib/adminApi';
import { Slide, SlideshowQueue } from '@/lib/slideshow';
import { backdropUrl } from '@/lib/upload';

interface GalleryRow {
  id: string;
  imageUrl: string;
  title: string | null;
  isPublished: boolean;
  createdAt?: string;
  guest?: { primaryName: string } | null;
}

/** How often the gallery is re-checked for new photos. */
const REFRESH_MS = 30_000;
/** Crossfade between photos. */
const FADE_MS = 2000;
const INTERVALS = [5, 8, 12, 20];
const MOTIONS = ['slideZoomIn', 'slideZoomOut', 'slideDriftLeft', 'slideDriftRight'];
const CONTROLS_HIDE_MS = 3000;

interface Layer {
  key: number;
  slide: Slide;
  motion: string;
}

/** Published gallery photos, in the slideshow's shape. Photos awaiting approval are left out. */
function toSlides(rows: GalleryRow[]): Slide[] {
  return rows
    .filter(r => r.isPublished && r.imageUrl)
    .map(r => ({ id: r.id, imageUrl: r.imageUrl, title: r.title, sharedBy: r.guest?.primaryName ?? null, createdAt: r.createdAt }));
}

/**
 * Resolves once the image is downloaded and decoded, so the crossfade never starts with a
 * half-loaded photo or stalls while a large photo is decoded.
 */
function preload(url: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image();
    const timer = setTimeout(() => resolve(true), 15_000); // slow network: show it anyway
    const done = (ok: boolean) => { clearTimeout(timer); resolve(ok); };
    img.onload = () => {
      if (typeof img.decode === 'function') img.decode().then(() => done(true), () => done(true));
      else done(true);
    };
    img.onerror = () => done(false);
    img.src = url;
  });
}

export default function SlideshowPage() {
  const queue = useRef(new SlideshowQueue());
  const stage = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const nextKey = useRef(0);

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [queued, setQueued] = useState(0);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(8);
  const [showNames, setShowNames] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const current = layers[layers.length - 1];
  const currentId = useRef<string | null>(null);
  useEffect(() => { currentId.current = current?.slide.id ?? null; }, [current]);

  const syncCounts = useCallback(() => {
    setCount(queue.current.size);
    setQueued(queue.current.queued);
  }, []);

  const advance = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      // Skip photos that fail to load (e.g. a broken link), trying each at most once.
      for (let tries = queue.current.size; tries > 0; tries--) {
        const slide = queue.current.next();
        if (!slide) break;
        const [ok] = await Promise.all([preload(slide.imageUrl), preload(backdropUrl(slide.imageUrl))]);
        if (ok) {
          const motion = MOTIONS[Math.floor(Math.random() * MOTIONS.length)];
          setLayers(ls => [...ls.slice(-2), { key: nextKey.current++, slide, motion }]);
          break;
        }
      }
      syncCounts();
    } finally {
      busy.current = false;
    }
  }, [syncCounts]);

  // Load the gallery, then keep checking for new photos.
  useEffect(() => {
    let cancelled = false;
    const refresh = () =>
      adminApi.getGallery()
        .then(rows => {
          if (cancelled) return;
          const slides = toSlides(rows as GalleryRow[]);
          queue.current.update(slides);
          // A photo deleted or unpublished while on screen leaves straight away.
          if (currentId.current && !slides.some(s => s.id === currentId.current)) {
            if (slides.length > 0) advance();
            else setLayers([]);
          }
          setError(null);
          setLoaded(true);
          syncCounts();
        })
        // Keep showing what we have if a check fails (e.g. venue Wi-Fi drops).
        .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load the gallery'); });
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [syncCounts, advance]);

  // Show the first photo once there is one (also when the first photo arrives later).
  useEffect(() => {
    if (loaded && !current && count > 0) advance();
  }, [loaded, current, count, advance]);

  // Move on after each photo's time is up.
  useEffect(() => {
    if (!current || paused) return;
    const id = setTimeout(advance, seconds * 1000);
    return () => clearTimeout(id);
  }, [current, paused, seconds, advance]);

  // Track fullscreen, and keep the screen awake while the slideshow is open.
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stage.current);
    document.addEventListener('fullscreenchange', onChange);
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then(l => { lock = l; }).catch(() => {});
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      lock?.release().catch(() => {});
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else stage.current?.requestFullscreen?.().catch(() => {});
  }, []);

  // Keyboard: space = pause/play, → = next photo, F = fullscreen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) return;
      if (e.key === ' ') { e.preventDefault(); setPaused(p => !p); }
      else if (e.key === 'ArrowRight') advance();
      else if (e.key.toLowerCase() === 'f') toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, toggleFullscreen]);

  // On-screen controls fade away when the mouse is still.
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showControls = () => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_MS);
  };
  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  const caption = (s: Slide) => (s.sharedBy ? `Shared by ${s.sharedBy}` : s.title);

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <h1 className="text-lg font-semibold text-gray-900">Slideshow</h1>
        <p className="text-xs text-gray-500">
          {count} {count === 1 ? 'photo' : 'photos'}
          {queued > 0 && <> · {queued} new up next</>}
        </p>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          Each photo
          <select
            value={seconds}
            onChange={e => setSeconds(Number(e.target.value))}
            className="border border-gray-300 rounded px-1.5 py-1 text-xs"
          >
            {INTERVALS.map(s => <option key={s} value={s}>{s} seconds</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={showNames} onChange={e => setShowNames(e.target.checked)} />
          Show who shared each photo
        </label>
        <button
          onClick={toggleFullscreen}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-900 text-white text-xs hover:bg-gray-700"
        >
          <RxEnterFullScreen size={14} /> Full screen
        </button>
      </div>

      <div
        ref={stage}
        data-testid="slideshow-stage"
        onMouseMove={showControls}
        className={`relative flex-1 overflow-hidden bg-neutral-950 ${fullscreen && !controlsVisible ? 'cursor-none' : ''}`}
      >
        {layers.map((layer, i) => {
          const backdrop = backdropUrl(layer.slide.imageUrl);
          return (
            // Each layer is fully opaque and fades in over the previous one; once it has, the
            // previous layer is removed (unseen, so nothing jumps).
            <div
              key={layer.key}
              className="absolute inset-0 bg-neutral-950 will-change-[opacity]"
              style={{ animation: `slideFadeIn ${FADE_MS}ms ease-in-out both` }}
              onAnimationEnd={e => {
                if (e.target === e.currentTarget && i === layers.length - 1) setLayers(ls => ls.slice(-1));
              }}
            >
              {/* Soft, blurred copy fills the screen behind the photo. Cloudinary sends a small,
                  already-blurred version; other images are blurred by the browser. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={backdrop}
                alt=""
                aria-hidden
                className={`absolute inset-0 w-full h-full object-cover scale-110 opacity-40 ${backdrop === layer.slide.imageUrl ? 'blur-2xl' : ''}`}
              />
              {/* The whole photo, never cropped, gently moving. */}
              <div className="absolute inset-0 flex items-center justify-center p-[4vmin]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={layer.slide.imageUrl}
                  alt={caption(layer.slide) || 'Gallery photo'}
                  className="slide-photo max-w-full max-h-full object-contain rounded-sm shadow-2xl will-change-transform [backface-visibility:hidden]"
                  style={{
                    animation: `${layer.motion} ${seconds * 1000 + FADE_MS * 2}ms ease-in-out both`,
                    animationPlayState: paused ? 'paused' : 'running',
                  }}
                />
              </div>
              {showNames && caption(layer.slide) && (
                <p
                  className="absolute bottom-[4vmin] left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/35 text-white/90 text-sm md:text-base font-serif italic tracking-wide backdrop-blur-sm"
                  style={{ animation: `slideFadeIn ${FADE_MS}ms ease-in-out ${FADE_MS / 2}ms both` }}
                >
                  {caption(layer.slide)}
                </p>
              )}
            </div>
          );
        })}

        {!current && (
          <div className="absolute inset-0 flex items-center justify-center text-center px-6">
            <p className="text-white/60 text-sm">
              {error ?? (!loaded ? 'Loading photos…' : 'No published gallery photos yet. New photos will appear here as soon as they are published.')}
            </p>
          </div>
        )}

        {current && (
          <div
            className={`absolute top-4 right-4 flex items-center gap-1 rounded-full bg-black/40 p-1 backdrop-blur-sm transition-opacity duration-500 ${
              controlsVisible || paused ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <button
              onClick={() => setPaused(p => !p)}
              aria-label={paused ? 'Play' : 'Pause'}
              className="p-2 rounded-full text-white hover:bg-white/15"
            >
              {paused ? <RxPlay size={16} /> : <RxPause size={16} />}
            </button>
            <button onClick={() => advance()} aria-label="Next photo" className="p-2 rounded-full text-white hover:bg-white/15">
              <RxTrackNext size={16} />
            </button>
            <button onClick={toggleFullscreen} aria-label="Full screen" className="p-2 rounded-full text-white hover:bg-white/15">
              <RxEnterFullScreen size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
