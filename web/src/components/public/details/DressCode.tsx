import type { DetailsPageContent } from '@/types/api';
import BrushSwatch from './BrushSwatch';
import DressCodePhotos from './DressCodePhotos';

export default function DressCode({ dressCode }: { dressCode: NonNullable<DetailsPageContent['dressCode']> }) {
  return (
    <section className="p-6 md:p-7 border border-[var(--border)] bg-white">
      {dressCode.eyebrow && <p className="text-xs uppercase tracking-[0.12em] text-[var(--accent)] mb-2">{dressCode.eyebrow}</p>}
      {dressCode.title && <h2 className="font-serif text-2xl md:text-3xl mb-3">{dressCode.title}</h2>}
      {dressCode.intro && <p className="text-sm text-[var(--muted)] mb-4 whitespace-pre-line">{dressCode.intro}</p>}
      {dressCode.guidelines.length > 0 && (
        <ul className="space-y-2 text-sm">
          {dressCode.guidelines.map(g => (
            <li key={g.id}>
              <p><span className="font-semibold">{g.label}:</span> {g.text}</p>
              {g.note && <p className="italic text-[var(--foreground)]/60 text-right">{g.note}</p>}
              {g.imageUrls?.length > 0 && <DressCodePhotos label={g.label} urls={g.imageUrls} />}
            </li>
          ))}
        </ul>
      )}
      {dressCode.palette.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 mt-6">
          {dressCode.palette.map((color, i) => <BrushSwatch key={`${color}-${i}`} color={color} />)}
        </div>
      )}
    </section>
  );
}
