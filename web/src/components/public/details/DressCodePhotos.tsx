'use client';

import { useEffect, useState } from 'react';
import { RxChevronLeft, RxChevronRight, RxCross2 } from 'react-icons/rx';
import { fitWidthUrl } from '@/lib/upload';

/** A guideline's example outfit photos, shown whole; tap one to see it full size. */
export default function DressCodePhotos({ label, urls }: { label: string; urls: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const many = urls.length > 1;
  const step = (dir: -1 | 1) => setOpen(i => (i == null ? null : (i + dir + urls.length) % urls.length));

  const isOpen = open != null;
  useEffect(() => {
    if (!isOpen) return;
    const n = urls.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      else if (e.key === 'ArrowLeft') setOpen(i => (i == null ? null : (i - 1 + n) % n));
      else if (e.key === 'ArrowRight') setOpen(i => (i == null ? null : (i + 1) % n));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, urls.length]);

  return (
    <>
      {/* Full width of the card: one photo spans it, several sit in two columns. Never cropped. */}
      <div className={`grid gap-3 mt-3 mb-1 items-start ${many ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
        {urls.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`${label} outfit idea ${i + 1} of ${urls.length}`}
            className="group block w-full overflow-hidden rounded-md border border-[var(--border)] bg-[var(--background)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fitWidthUrl(url, many ? 1000 : 1600)}
              alt=""
              loading="lazy"
              onError={e => { if (e.currentTarget.src !== url) e.currentTarget.src = url; }}
              className="block w-full h-auto transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </button>
        ))}
      </div>

      {open != null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${label} outfit ideas`}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setOpen(null)}
        >
          <button className="absolute top-4 left-4 text-white hover:text-[var(--accent)]" onClick={() => setOpen(null)} aria-label="Close">
            <RxCross2 size={28} />
          </button>
          {many && (
            <button className="absolute left-4 md:left-8 text-white hover:text-[var(--accent)]" onClick={e => { e.stopPropagation(); step(-1); }} aria-label="Previous">
              <RxChevronLeft size={36} />
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urls[open]}
            alt={`${label} outfit idea ${open + 1}`}
            className="max-h-[80vh] max-w-full object-contain"
            onClick={e => e.stopPropagation()}
          />
          {many && (
            <button className="absolute right-4 md:right-8 text-white hover:text-[var(--accent)]" onClick={e => { e.stopPropagation(); step(1); }} aria-label="Next">
              <RxChevronRight size={36} />
            </button>
          )}
          <p className="absolute bottom-4 text-white/70 text-sm text-center px-4">
            {label}{many && ` · ${open + 1} of ${urls.length}`}
          </p>
        </div>
      )}
    </>
  );
}
