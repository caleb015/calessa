import { publicApi } from '@/lib/api';

export default async function SchedulePage() {
  const items = await publicApi.getSchedule().catch(() => []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)] mb-3">The Day Of</p>
        <h1 className="text-4xl md:text-5xl font-serif">Schedule</h1>
      </div>

      {items.length === 0 && (
        <p className="text-center text-[var(--muted)]">The schedule will be announced soon.</p>
      )}

      <div className="space-y-0">
        {items.map((item, i) => (
          <div key={item.id} className="flex gap-6 group">
            {/* Time column */}
            <div className="w-24 shrink-0 pt-1 text-right">
              <span className="text-sm text-[var(--accent)] font-medium">{item.timeLabel}</span>
            </div>

            {/* Line + dot */}
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-[var(--accent)] ring-4 ring-[var(--background)] shrink-0 mt-1" />
              {i < items.length - 1 && <div className="w-px flex-1 bg-[var(--border)] my-1" />}
            </div>

            {/* Content */}
            <div className="pb-8">
              <h3 className="font-serif text-lg">{item.title}</h3>
              {item.location && (
                <p className="text-[var(--muted)] text-sm mt-0.5">{item.location}</p>
              )}
              {item.description && (
                <p className="text-[var(--muted)] text-sm mt-1 leading-relaxed">{item.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
