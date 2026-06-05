import { publicApi } from '@/lib/api';
import FaqAccordion from '@/components/public/FaqAccordion';

export default async function FaqPage() {
  const faqs = await publicApi.getFaqs().catch(() => []);

  const categories = Array.from(new Set(faqs.map(f => f.category ?? 'General')));

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)] mb-3">Got Questions?</p>
        <h1 className="text-4xl md:text-5xl font-serif">FAQ</h1>
      </div>

      {faqs.length === 0 && (
        <p className="text-center text-[var(--muted)]">FAQs coming soon.</p>
      )}

      {categories.map(cat => {
        const items = faqs.filter(f => (f.category ?? 'General') === cat);
        return (
          <div key={cat} className="mb-10">
            {categories.length > 1 && (
              <h2 className="text-xs uppercase tracking-widest text-[var(--accent)] mb-4">{cat}</h2>
            )}
            <FaqAccordion items={items} />
          </div>
        );
      })}
    </div>
  );
}
