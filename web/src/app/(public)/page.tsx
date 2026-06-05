import Link from 'next/link';
import Image from 'next/image';
import { publicApi } from '@/lib/api';
import Countdown from '@/components/public/Countdown';

export default async function HomePage() {
  const settings = await publicApi.getSettings().catch(() => null);
  const events = await publicApi.getEvents().catch(() => []);

  const coupleA = settings?.coupleNameA ?? 'Caleb';
  const coupleB = settings?.coupleNameB ?? 'Raissa';
  const heroSrc = settings?.heroImageUrl ?? '/images/hero.png';
  const hasImage = true; // always has hero
  const textColor = 'text-white';
  const mutedColor = 'text-white/60';
  const btnClass = 'border-white/50 text-white hover:bg-white hover:text-[#1e2b1a]';

  const weddingDateFormatted = settings?.weddingDate
    ? new Date(settings.weddingDate).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : null;

  const ceremony = events.find(e => e.type === 'ceremony');
  const reception = events.find(e => e.type === 'reception');

  return (
    <div className="overflow-x-hidden">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6">
        {/* Hero image */}
        <Image
          src={heroSrc}
          alt="Hero"
          fill
          priority
          className="object-cover object-top"
          sizes="100vw"
        />

        {/* Gradient scrim — dark at bottom so text is legible, transparent at top so photo breathes */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Text anchored to bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-8 pb-14 flex flex-col items-center text-center">
          <p className={`text-[10px] tracking-[0.45em] uppercase mb-5 ${mutedColor}`}>
            {weddingDateFormatted ?? 'Save the Date'}
          </p>
          <div className="flex flex-col items-center leading-none">
            <h1 className={`font-serif text-[clamp(3rem,11vw,8rem)] ${textColor} leading-[0.85] tracking-tight drop-shadow-lg`}>
              {coupleA}
            </h1>
            <span className={`font-serif text-[clamp(1rem,2.5vw,2rem)] ${mutedColor} tracking-[0.5em] my-2`}>&</span>
            <h1 className={`font-serif text-[clamp(3rem,11vw,8rem)] ${textColor} leading-[0.85] tracking-tight drop-shadow-lg`}>
              {coupleB}
            </h1>
          </div>
          <Link
            href="/rsvp"
            className={`mt-8 border text-[10px] tracking-[0.35em] uppercase px-10 py-3.5 transition-all duration-300 backdrop-blur-sm ${btnClass}`}
          >
            RSVP
          </Link>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-4 right-6 flex flex-col items-center gap-1.5 text-white/30 z-10">
          <div className="w-px h-8 bg-current relative overflow-hidden">
            <div className="absolute top-0 w-full h-[40%] bg-white/60 animate-[scrollDot_1.8s_ease-in-out_infinite]" />
          </div>
        </div>
      </section>

      {/* ── Countdown ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 text-center bg-[var(--background)]">
        <p className="text-[9px] tracking-[0.45em] uppercase text-[var(--muted)] mb-10">
          Until we say I do
        </p>
        {settings?.weddingDate ? (
          <Countdown date={settings.weddingDate} />
        ) : (
          <p className="text-[var(--muted)] font-serif italic text-lg">Wedding date to be announced</p>
        )}
      </section>

      {/* ── Ornamental divider ────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 max-w-sm mx-auto px-6">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-[var(--accent)]">✦</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>

      {/* ── Welcome ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 max-w-2xl mx-auto text-center">
        <p className="font-serif text-xl md:text-2xl text-[var(--foreground)] leading-relaxed italic">
          &ldquo;{settings?.welcomeMessage ?? 'We are so excited to celebrate this special day with our family and friends. Please join us!'}&rdquo;
        </p>
        <p className="mt-6 font-serif text-[var(--accent)] text-sm tracking-widest">
          — {coupleA} &amp; {coupleB}
        </p>
      </section>

      {/* ── Event highlights ─────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-[#f2ede8]">
        <p className="text-[9px] tracking-[0.45em] uppercase text-[var(--muted)] text-center mb-14">
          The Celebration
        </p>
        <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-px bg-[#d8cfc6]">
          <div className="bg-[#f2ede8] p-10 text-center">
            <p className="text-[9px] tracking-[0.35em] uppercase text-[var(--accent)] mb-3">Ceremony</p>
            <h3 className="font-serif text-2xl mb-3">{ceremony?.title ?? 'Wedding Ceremony'}</h3>
            <p className="text-[var(--muted)] text-sm">{ceremony?.venueName ?? 'Venue TBA'}</p>
            {ceremony?.startTime && (
              <p className="text-[var(--muted)] text-sm mt-1">
                {new Date(ceremony.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })}
              </p>
            )}
          </div>
          <div className="bg-[#f2ede8] p-10 text-center">
            <p className="text-[9px] tracking-[0.35em] uppercase text-[var(--accent)] mb-3">Reception</p>
            <h3 className="font-serif text-2xl mb-3">{reception?.title ?? 'Wedding Reception'}</h3>
            <p className="text-[var(--muted)] text-sm">{reception?.venueName ?? 'Venue TBA'}</p>
            {reception?.startTime && (
              <p className="text-[var(--muted)] text-sm mt-1">
                {new Date(reception.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })}
              </p>
            )}
          </div>
        </div>
        <div className="text-center mt-12">
          <Link
            href="/details"
            className="text-[10px] tracking-[0.35em] uppercase text-[var(--foreground)] border-b border-[var(--foreground)] pb-0.5 hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
          >
            View full details →
          </Link>
        </div>
      </section>

      {/* ── RSVP banner ──────────────────────────────────────────────────── */}
      <section className="py-28 px-6 text-center" style={{ backgroundColor: '#1a2618' }}>
        <p className="text-[9px] tracking-[0.45em] uppercase text-white/30 mb-6">You&apos;re invited</p>
        <h2 className="font-serif text-4xl md:text-6xl text-white mb-10">Will you join us?</h2>
        <Link
          href="/rsvp"
          className="inline-block border border-white/30 text-white text-[10px] tracking-[0.35em] uppercase px-12 py-4 hover:bg-white hover:text-[#2a1f1a] transition-all duration-300"
        >
          RSVP Now
        </Link>
      </section>

    </div>
  );
}
