import { Suspense } from 'react';
import Link from 'next/link';
import { publicApi } from '@/lib/api';
import GuestPhotoUpload from '@/components/public/GuestPhotoUpload';

export default async function GalleryUploadPage() {
  const settings = await publicApi.getGallerySettings().catch(() => null);

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)] mb-3">Gallery</p>
        <h1 className="text-4xl md:text-5xl font-serif">{settings?.heading ?? 'Share your photos'}</h1>
      </div>

      {settings?.uploadsEnabled ? (
        // GuestPhotoUpload reads ?code= from the link
        <Suspense>
          <GuestPhotoUpload />
        </Suspense>
      ) : (
        <p className="text-center text-[var(--muted)]">
          Photo sharing is closed right now. <Link href="/gallery" className="underline">Back to the gallery</Link>
        </p>
      )}
    </div>
  );
}
