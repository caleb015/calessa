'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RxCross2, RxChevronLeft, RxChevronRight } from 'react-icons/rx';
import { publicApi } from '@/lib/api';
import { fitWidthUrl, thumbnailUrl } from '@/lib/upload';
import type { GalleryImage } from '@/types/api';

/**
 * Photo grid with a lightbox. Starts with the first page of photos; more are fetched as the
 * visitor nears the end of the grid (or presses "Show more photos"), so a gallery of thousands
 * only downloads what is looked at. The grid shows small square copies; the lightbox a screen-sized one.
 */
export default function GalleryGrid({ images: firstPage, total = firstPage.length }: { images: GalleryImage[]; total?: number }) {
  const [images, setImages] = useState(firstPage);
  const [knownTotal, setKnownTotal] = useState(total);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const fetching = useRef(false);
  // Pressing "next" on the last loaded photo fetches more, then moves on.
  const advanceAfterLoad = useRef(false);

  const hasMore = images.length < knownTotal;

  const loadMore = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    setLoadingMore(true);
    setLoadError(false);
    try {
      const page = await publicApi.getGalleryPage(images.length);
      setImages(prev => {
        const seen = new Set(prev.map(img => img.id));
        return [...prev, ...page.images.filter(img => !seen.has(img.id))];
      });
      // An empty page means photos were removed meanwhile: stop asking.
      setKnownTotal(page.images.length === 0 ? images.length : page.total);
      if (advanceAfterLoad.current) setLightboxIndex(i => (i != null && page.images.length > 0 ? i + 1 : i != null ? 0 : null));
    } catch {
      setLoadError(true);
    } finally {
      advanceAfterLoad.current = false;
      fetching.current = false;
      setLoadingMore(false);
    }
  }, [images.length]);

  // Fetch the next page when the end of the grid comes into view.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || loadError || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) loadMore();
    }, { rootMargin: '800px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadError, loadMore]);

  const prev = () => setLightboxIndex(i => (i != null ? (i - 1 + images.length) % images.length : null));
  const next = () => {
    if (lightboxIndex == null) return;
    if (lightboxIndex + 1 < images.length) setLightboxIndex(lightboxIndex + 1);
    else if (hasMore) { advanceAfterLoad.current = true; loadMore(); }
    else setLightboxIndex(0);
  };

  const current = lightboxIndex != null ? images[lightboxIndex] : null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setLightboxIndex(i)}
            className="aspect-square overflow-hidden bg-[var(--border)] group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl(img.imageUrl, 400)}
              srcSet={`${thumbnailUrl(img.imageUrl, 400)} 400w, ${thumbnailUrl(img.imageUrl, 700)} 700w`}
              sizes="(min-width: 1024px) 280px, (min-width: 768px) 33vw, 50vw"
              alt={img.title ?? (img.sharedBy ? `Photo shared by ${img.sharedBy}` : `Photo ${i + 1}`)}
              loading="lazy"
              decoding="async"
              // Very large animations can't be resized on the free plan; fall back to the original.
              onError={e => {
                if (e.currentTarget.src !== img.imageUrl) {
                  e.currentTarget.srcset = '';
                  e.currentTarget.src = img.imageUrl;
                }
              }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </button>
        ))}
      </div>

      {hasMore && (
        <div ref={sentinel} className="mt-10 text-center">
          <button
            onClick={() => loadMore()}
            disabled={loadingMore}
            className="text-[10px] tracking-[0.35em] uppercase text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-60 transition-colors"
          >
            {loadingMore ? 'Loading photos…' : loadError ? "Couldn't load more photos. Try again" : 'Show more photos'}
          </button>
          <p className="mt-2 text-xs text-[var(--muted)]">
            {images.length} of {knownTotal}
          </p>
        </div>
      )}

      {/* Lightbox */}
      {current && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute top-4 left-4 text-white hover:text-[var(--accent)]"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close"
          >
            <RxCross2 size={28} />
          </button>
          <button
            className="absolute left-4 text-white hover:text-[var(--accent)] md:left-8"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Previous"
          >
            <RxChevronLeft size={36} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={current.id}
            src={fitWidthUrl(current.imageUrl, 1920)}
            alt={current.title ?? ''}
            className="max-h-[80vh] max-w-full object-contain"
            onError={e => { if (e.currentTarget.src !== current.imageUrl) e.currentTarget.src = current.imageUrl; }}
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute right-4 text-white hover:text-[var(--accent)] md:right-8"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Next"
          >
            <RxChevronRight size={36} />
          </button>
          {(current.title || current.sharedBy) && (
            <p className="absolute bottom-4 text-white/70 text-sm text-center px-4">
              {[current.title, current.sharedBy && `Shared by ${current.sharedBy}`]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>
      )}
    </>
  );
}
