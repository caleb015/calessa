import Link from 'next/link';
import type { DetailsPageContent } from '@/types/api';

export default function DetailsCta({ cta }: { cta: NonNullable<DetailsPageContent['cta']> }) {
  return (
    <div className="text-center mt-14">
      <h2 className="font-serif text-2xl md:text-3xl mb-2">{cta.heading}</h2>
      {cta.subtext && <p className="text-sm text-[var(--foreground)]/60 mb-5">{cta.subtext}</p>}
      <Link
        href="/schedule"
        className="inline-block w-full max-w-sm rounded-full bg-[var(--muted)] text-white font-semibold px-8 py-3 hover:opacity-90 transition-opacity"
      >
        {cta.buttonLabel} →
      </Link>
    </div>
  );
}
