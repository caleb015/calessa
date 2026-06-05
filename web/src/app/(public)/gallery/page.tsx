import { publicApi } from '@/lib/api';
import GalleryGrid from '@/components/public/GalleryGrid';

export default async function GalleryPage() {
  const images = await publicApi.getGallery().catch(() => []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)] mb-3">Memories</p>
        <h1 className="text-4xl md:text-5xl font-serif">Gallery</h1>
      </div>

      {images.length === 0 && (
        <p className="text-center text-[var(--muted)]">Photos coming soon.</p>
      )}

      <GalleryGrid images={images} />
    </div>
  );
}
