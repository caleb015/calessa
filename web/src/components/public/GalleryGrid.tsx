'use client';

import { useState } from 'react';
import { RxCross2, RxChevronLeft, RxChevronRight } from 'react-icons/rx';
import type { GalleryImage } from '@/types/api';

export default function GalleryGrid({ images }: { images: GalleryImage[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const prev = () => setLightboxIndex(i => (i != null ? (i - 1 + images.length) % images.length : null));
  const next = () => setLightboxIndex(i => (i != null ? (i + 1) % images.length : null));

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setLightboxIndex(i)}
            className="aspect-square overflow-hidden bg-[var(--border)] group"
          >
            <img
              src={img.imageUrl}
              alt={img.title ?? `Photo ${i + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-[var(--accent)]"
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
          <img
            src={images[lightboxIndex].imageUrl}
            alt={images[lightboxIndex].title ?? ''}
            className="max-h-[80vh] max-w-full object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute right-4 text-white hover:text-[var(--accent)] md:right-8"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Next"
          >
            <RxChevronRight size={36} />
          </button>
          {images[lightboxIndex].title && (
            <p className="absolute bottom-4 text-white/70 text-sm">
              {images[lightboxIndex].title}
            </p>
          )}
        </div>
      )}
    </>
  );
}
