import { publicApi } from '@/lib/api';

export default async function StoryPage() {
  const items = await publicApi.getStory().catch(() => []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)] mb-3">Our Story</p>
        <h1 className="text-4xl md:text-5xl font-serif">How It All Began</h1>
      </div>

      {items.length === 0 && (
        <p className="text-center text-[var(--muted)]">Our story is coming soon.</p>
      )}

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-[var(--border)] -translate-x-1/2" />

        <div className="space-y-12">
          {items.map((item, i) => (
            <div
              key={item.id}
              className={`relative flex gap-8 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-start`}
            >
              {/* Dot */}
              <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[var(--accent)] ring-4 ring-[var(--background)] mt-1.5" />

              {/* Content */}
              <div className={`pl-12 md:pl-0 md:w-1/2 ${i % 2 === 0 ? 'md:pr-12' : 'md:pl-12'}`}>
                {item.dateLabel && (
                  <p className="text-xs text-[var(--accent)] uppercase tracking-widest mb-1">
                    {item.dateLabel}
                  </p>
                )}
                <h3 className="font-serif text-xl mb-2">{item.title}</h3>
                {item.description && (
                  <p className="text-[var(--muted)] leading-relaxed">{item.description}</p>
                )}
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="mt-4 w-full max-w-xs rounded object-cover"
                  />
                )}
              </div>

              {/* Spacer for opposite side */}
              <div className="hidden md:block md:w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
