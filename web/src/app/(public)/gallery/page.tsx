import { publicApi } from '@/lib/api';
import GalleryGrid from '@/components/public/GalleryGrid';
import GalleryShareCard from '@/components/public/GalleryShareCard';

export default async function GalleryPage() {
  const [images, settings] = await Promise.all([
    publicApi.getGallery().catch(() => []),
    publicApi.getGallerySettings().catch(() => null),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)] mb-3">Memories</p>
        <h1 className="text-4xl md:text-5xl font-serif">Gallery</h1>
      </div>

      {settings?.uploadsEnabled && <GalleryShareCard settings={settings} />}

      {images.length === 0 && (
        <p className="text-center text-[var(--muted)]">Photos coming soon.</p>
      )}

      <GalleryGrid images={images} />
    </div>
  );
}
