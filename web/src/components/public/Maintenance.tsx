// Shown instead of the public site while "Site is public" is off.

import Countdown from '@/components/public/Countdown';

function SetupIllustration() {
  const ink = 'var(--foreground)';
  const accent = 'var(--accent)';
  const muted = 'var(--muted)';
  const bulbs = [30, 62, 94, 126, 160, 194, 226, 258, 290];

  return (
    <svg viewBox="0 0 320 220" role="img" aria-label="A wedding arch being set up, with a ladder, chairs and boxes" className="w-full max-w-sm mx-auto">
      {/* String lights */}
      <path d="M10 12 Q160 52 310 12" fill="none" stroke={muted} strokeWidth="1.5" />
      {bulbs.map(x => {
        const t = (x - 10) / 300;
        const y = (1 - t) * (1 - t) * 12 + 2 * (1 - t) * t * 52 + t * t * 12;
        return <circle key={x} cx={x} cy={y + 5} r="3.5" fill={accent} opacity="0.85" />;
      })}

      {/* Arch */}
      <path d="M110 190 V95 A50 50 0 0 1 210 95 V190" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      {/* Flowers on the arch (half finished) */}
      {[[112, 92], [118, 76], [128, 63], [141, 53], [122, 104], [114, 118]].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="7" fill={accent} opacity={i % 2 ? 0.6 : 0.9} />
          <circle cx={cx} cy={cy} r="2" fill="var(--background)" />
        </g>
      ))}
      {/* Draped fabric still being hung */}
      <path d="M160 45 q-6 40 -26 60 M160 45 q8 30 4 56" fill="none" stroke={muted} strokeWidth="1.5" strokeDasharray="3 3" />

      {/* Ladder leaning on the arch */}
      <line x1="232" y1="190" x2="200" y2="96" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="250" y1="190" x2="218" y2="96" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
      {[0.15, 0.32, 0.49, 0.66, 0.83].map(t => (
        <line key={t} x1={232 - 32 * t} y1={190 - 94 * t} x2={250 - 32 * t} y2={190 - 94 * t} stroke={ink} strokeWidth="2" />
      ))}

      {/* Chairs */}
      {[22, 52, 82].map(x => (
        <g key={x} fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round">
          <path d={`M${x} 190 V160 M${x + 18} 190 V174 M${x} 174 H${x + 18}`} />
          <path d={`M${x} 160 H${x + 4}`} />
        </g>
      ))}

      {/* Boxes */}
      <g fill="none" stroke={ink} strokeWidth="2">
        <rect x="262" y="158" width="40" height="32" />
        <rect x="270" y="132" width="26" height="26" />
        <path d="M262 168 H302 M283 132 V158" stroke={muted} />
      </g>
      <path d="M283 128 c-6 -8 -12 0 0 4 c12 -4 6 -12 0 -4" fill="none" stroke={accent} strokeWidth="1.5" />

      {/* Ground */}
      <line x1="8" y1="190" x2="312" y2="190" stroke={muted} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function Maintenance({ coupleNames, weddingDate }: { coupleNames: string; weddingDate?: string | null }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="text-center max-w-md">
        <SetupIllustration />
        <p className="mt-8 text-xs uppercase tracking-[0.3em] text-[var(--accent)]">{coupleNames}</p>
        <h1 className="mt-3 font-serif text-4xl md:text-5xl text-[var(--foreground)]">Under Maintenance</h1>
        <p className="mt-4 text-[var(--muted)]">
          We&apos;re busy setting things up. Please check back soon!
        </p>
        {weddingDate && (
          <div className="mt-12">
            <div className="flex items-center gap-4 max-w-[12rem] mx-auto mb-8" aria-hidden>
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-[var(--accent)] text-xs">✦</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>
            <p className="text-[9px] tracking-[0.45em] uppercase text-[var(--muted)] mb-6">Until we say I do</p>
            <Countdown date={weddingDate} />
          </div>
        )}
      </div>
    </main>
  );
}
