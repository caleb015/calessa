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
          {items.map((item, i) => {
            const textLeft = i % 2 === 0;
            return (
              <div key={item.id} className="relative grid md:grid-cols-2 items-start">
                {/* Dot */}
                <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[var(--accent)] ring-4 ring-[var(--background)] mt-1.5 z-10" />

                {/* Content */}
                {/* Text hugs the timeline: right-aligned on the left side, left-aligned on the right */}
                <div className={`pl-12 md:row-start-1 ${textLeft ? 'md:col-start-1 md:pl-0 md:pr-12 md:text-right' : 'md:col-start-2 md:pl-12'}`}>
                  {item.dateLabel && (
                    <div className={`relative flex items-center mb-1 md:pt-1 ${textLeft ? 'md:justify-end' : ''}`}>
                      <p className="text-xs text-[var(--accent)] uppercase tracking-widest">
                        {item.dateLabel}
                      </p>
                      {/* Joins the date to its dot, like the photo connector on the other side */}
                      <span
                        aria-hidden
                        className={`hidden md:block absolute top-3 -translate-y-1/2 w-9 h-px bg-[var(--accent)] opacity-60 ${
                          textLeft ? 'left-[calc(100%+0.75rem)]' : 'right-[calc(100%+0.75rem)]'
                        }`}
                      />
                    </div>
                  )}
                  <h3 className="font-serif text-xl mb-2">{item.title}</h3>
                  {item.description && (
                    <p className="text-[var(--muted)] leading-relaxed">{item.description}</p>
                  )}
                </div>

                {/* Photo: under the text on mobile; across the line on desktop, joined to the dot */}
                {item.imageUrl && (
                  <div
                    className={`relative pl-12 mt-4 md:mt-0 md:row-start-1 md:flex ${
                      textLeft ? 'md:col-start-2 md:justify-start' : 'md:col-start-1 md:pl-0 md:pr-12 md:justify-end'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`hidden md:block absolute top-3 -translate-y-1/2 h-px w-12 bg-[var(--accent)] opacity-60 ${textLeft ? 'left-0' : 'right-0'}`}
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      loading="lazy"
                      className="block w-auto h-auto max-w-full md:max-w-xs max-h-[28rem] rounded-md border border-[var(--border)] shadow-sm"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
