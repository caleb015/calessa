import Link from 'next/link';
import { FiCamera } from 'react-icons/fi';
import type { GallerySettings } from '@/types/api';

/** Invitation on the Gallery page for guests to add their own photos (wording set in the dashboard). */
export default function GalleryShareCard({ settings }: { settings: GallerySettings }) {
  return (
    <section className="mx-auto mb-12 max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface,transparent)] px-6 py-8 text-center">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
        <FiCamera size={22} aria-hidden />
      </span>
      <h2 className="font-serif text-2xl md:text-3xl">{settings.heading}</h2>
      {settings.subtext && <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">{settings.subtext}</p>}
      <Link
        href="/gallery/upload"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-7 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        {settings.buttonLabel} →
      </Link>
    </section>
  );
}
