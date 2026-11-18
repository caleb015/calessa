import Link from 'next/link';
import Image from 'next/image';
import { publicApi } from '@/lib/api';
import Countdown from '@/components/public/Countdown';
import MomentsSlider from '@/components/public/MomentsSlider';
import { FiMapPin } from 'react-icons/fi';
import { croppedUrl, fitWidthUrl } from '@/lib/upload';

const leftNavLinks = [
  { href: '/story', label: 'Our Story' },
  { href: '/details', label: 'Details' },
  { href: '/schedule', label: 'Schedule' },
];

const rightNavLinks = [
  { href: '/rsvp', label: 'RSVP' },
  { href: '/faq', label: 'FAQ' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/contact', label: 'Contact' },
];

export default async function HomePage() {
  const [settings, events, story, homepagePhotos] = await Promise.all([
    publicApi.getSettings().catch(() => null),
    publicApi.getEvents().catch(() => []),
    publicApi.getStory().catch(() => []),
    // Only the first few Moments photos come with the page; the slider fetches the rest as it's used.
    publicApi.getHomepageGallery().catch(() => ({ images: [], total: 0, seed: null })),
  ]);

  const coupleA = settings?.coupleNameA ?? 'Caleb';
  const coupleB = settings?.coupleNameB ?? 'Raissa';
  const heroSrc = settings?.heroImageUrl ?? '/images/hero.png';
  // Shifts the image by a percentage of its own rendered height/width via
  // transform, not object-position (whose percentages interact non-linearly
  // with cover-scaling overflow and barely move the image visually).
  // 0 = no shift. Positive Y moves the image up; positive X moves it right.
  const heroOffsetX = settings?.heroImageOffsetX ?? 0;
  const heroOffsetY = settings?.heroImageOffsetY ?? 0;
  const heroHeight = settings?.heroImageHeight ?? 100;
  const monogramSrc = settings?.monogramUrl ?? '/images/rc-monogram-floral-green.png';
  const hasImage = true; // always has hero
  const textColor = 'text-[var(--overlay-text)]';
  const mutedColor = 'text-[var(--overlay-text)]/60';
  const btnClass = 'border-[var(--overlay-text)]/50 text-[var(--overlay-text)] hover:bg-white hover:text-[var(--foreground)]';

  const weddingDateFormatted = settings?.weddingDate
    ? new Date(settings.weddingDate).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila',
      })
    : null;

  const homepageEvents = events.filter(e => e.showOnHomepage);
  // A peek at the story: the first three milestones that have a photo.
  const storyPeek = story.filter(item => item.imageUrl?.trim()).slice(0, 3);
  const welcomePhoto = settings?.welcomeImageUrl?.trim() || null;
  const rsvpPhoto = settings?.rsvpBannerImageUrl?.trim() || null;

  return (
    <div className="overflow-x-hidden">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden flex flex-col items-center justify-center text-center px-6" style={{ height: `${heroHeight}vh` }}>
        {/* Hero image */}
        <Image
          src={heroSrc}
          alt="Hero"
          fill
          priority
          className="object-cover"
          style={{ transform: `translate(${heroOffsetX}%, ${-heroOffsetY}%)` }}
          sizes="100vw"
        />

        {/* Gradient scrim — dark at bottom so text is legible, transparent at top so photo breathes */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--overlay-scrim)]/80 via-[var(--overlay-scrim)]/20 to-transparent" />

        {/* Desktop top nav — monogram centerpiece flanked by page links, clustered at center */}
        <nav className="hidden md:flex absolute top-0 left-0 right-0 z-20 items-center justify-center gap-10 px-10 pt-8">
          <div className="flex items-center gap-8">
            {leftNavLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-[11px] tracking-[0.25em] uppercase text-white/80 hover:text-white transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
          <Link href="/">
            <Image src={monogramSrc} alt="Caleb & Raissa" width={68} height={68} className="opacity-90" />
          </Link>
          <div className="flex items-center gap-8">
            {rightNavLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-[11px] tracking-[0.25em] uppercase text-white/80 hover:text-white transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Text centered in hero */}
        <div className="relative z-10 px-8 flex flex-col items-center text-center">
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
            className={`mt-8 border text-[10px] tracking-[0.35em] uppercase px-10 py-4 transition-all duration-300 backdrop-blur-sm ${btnClass}`}
          >
            RSVP
          </Link>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-4 right-6 flex flex-col items-center gap-1.5 text-[var(--overlay-text)]/30 z-10">
          <div className="w-px h-8 bg-current relative overflow-hidden">
            <div className="absolute top-0 w-full h-[40%] bg-[var(--overlay-text)]/60 animate-[scrollDot_1.8s_ease-in-out_infinite]" />
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
      {/* With a welcome photo, the photo sits beside the message (above it on phones). */}
      <section
        className={welcomePhoto
          ? 'py-20 px-6 max-w-5xl mx-auto grid gap-10 md:gap-16 md:grid-cols-[0.9fr_1.1fr] items-center'
          : 'py-20 px-6 max-w-2xl mx-auto text-center'}
      >
        {welcomePhoto && (
          <div className="aspect-[4/3] md:aspect-[4/5] overflow-hidden bg-[var(--surface)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fitWidthUrl(welcomePhoto, 1000)} alt={`${coupleA} & ${coupleB}`} loading="lazy" className="w-full h-full object-cover" />
          </div>
        )}
        <div>
          <p className="font-serif text-xl md:text-2xl text-[var(--foreground)] leading-relaxed italic">
            &ldquo;{settings?.welcomeMessage ?? 'We are so excited to celebrate this special day with our family and friends. Please join us!'}&rdquo;
          </p>
          <p className="mt-6 font-serif text-[var(--accent)] text-sm tracking-widest">
            — {coupleA} &amp; {coupleB}
          </p>
        </div>
      </section>

      {/* ── A peek at our story ──────────────────────────────────────────── */}
      {storyPeek.length > 0 && (
        <section className="pb-20 px-6 text-center">
          <p className="text-[9px] tracking-[0.45em] uppercase text-[var(--muted)] mb-3">Our Story</p>
          <h2 className="font-serif text-3xl md:text-4xl mb-10">How we got here</h2>
          <div
            className={`mx-auto grid gap-8 ${
              storyPeek.length === 1 ? 'max-w-md' : storyPeek.length === 2 ? 'max-w-3xl sm:grid-cols-2' : 'max-w-5xl sm:grid-cols-3'
            }`}
          >
            {storyPeek.map(item => (
              <Link key={item.id} href="/story" className="group block">
                <div className="aspect-[4/3] overflow-hidden bg-[var(--surface)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={croppedUrl(item.imageUrl!, 800, 600)}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                {item.dateLabel && (
                  <p className="mt-4 text-[10px] tracking-[0.3em] uppercase text-[var(--muted)]">{item.dateLabel}</p>
                )}
                <p className="mt-1 font-serif text-lg leading-snug">{item.title}</p>
              </Link>
            ))}
          </div>
          <Link
            href="/story"
            className="group inline-block mt-10 py-4 text-[10px] tracking-[0.35em] uppercase text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
          >
            <span className="border-b border-[var(--foreground)] pb-0.5 group-hover:border-[var(--accent)] transition-colors">Read our story →</span>
          </Link>
        </section>
      )}

      {/* ── Moments: a slider of the gallery photos picked for the homepage ── */}
      {homepagePhotos.images.length > 0 && (
        <section className="py-20 px-6 border-t border-[var(--border)]">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap items-baseline justify-between gap-4 mb-8">
              <div>
                <p className="text-[9px] tracking-[0.45em] uppercase text-[var(--muted)] mb-3">Moments</p>
                <h2 className="font-serif text-3xl md:text-4xl">With the people we love</h2>
              </div>
              <Link
                href="/gallery"
                className="group inline-block py-2 text-[10px] tracking-[0.35em] uppercase text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
              >
                <span className="border-b border-[var(--foreground)] pb-0.5 group-hover:border-[var(--accent)] transition-colors">See the gallery →</span>
              </Link>
            </div>
            <MomentsSlider photos={homepagePhotos.images} total={homepagePhotos.total} seed={homepagePhotos.seed} />
          </div>
        </section>
      )}

      {/* ── Event highlights ─────────────────────────────────────────────── */}
      {homepageEvents.length > 0 && (
        <section className="py-20 px-6 bg-[var(--surface)]">
          <p className="text-[9px] tracking-[0.45em] uppercase text-[var(--muted)] text-center mb-8">
            The Celebration
          </p>
          <div
            className={`mx-auto grid gap-px bg-[var(--border)] ${
              homepageEvents.length === 1
                ? 'max-w-md'
                : homepageEvents.length === 2
                  ? 'max-w-3xl md:grid-cols-2'
                  : 'max-w-5xl md:grid-cols-3'
            }`}
          >
            {homepageEvents.map(event => (
              <div key={event.id} className="bg-[var(--surface)] px-10 py-6 text-center">
                <h3 className="font-serif text-2xl mb-3">{event.title}</h3>
                {event.venueName && <p className="text-[var(--muted)] text-sm">{event.venueName}</p>}
                {event.address && (
                  <p className="text-[var(--muted)] text-sm">
                    {event.mapUrl && /^https?:\/\//i.test(event.mapUrl) ? (
                      <a
                        href={event.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-1 hover:text-[var(--accent)] transition-colors"
                      >
                        <FiMapPin aria-hidden className="shrink-0" size={13} />
                        <span className="underline decoration-[var(--muted)]/40 underline-offset-4 group-hover:decoration-[var(--accent)]">{event.address}</span>
                        <span className="sr-only"> (opens map in a new tab)</span>
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <FiMapPin aria-hidden className="shrink-0" size={13} />
                        {event.address}
                      </span>
                    )}
                  </p>
                )}
                {event.startTime && (
                  <>
                    <p className="text-[var(--muted)] text-sm mt-1">
                      {new Date(event.startTime).toLocaleDateString('en-US', {
                        month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila',
                      })}
                    </p>
                    <p className="text-[var(--muted)] text-sm">
                      {new Date(event.startTime).toLocaleTimeString('en-US', {
                        hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila',
                      })}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/details"
              className="group inline-block py-4 text-[10px] tracking-[0.35em] uppercase text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
            >
              <span className="border-b border-[var(--foreground)] pb-0.5 group-hover:border-[var(--accent)] transition-colors">View full details →</span>
            </Link>
          </div>
        </section>
      )}

      {/* ── RSVP banner ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-28 px-6 text-center bg-[var(--inverse-background)]">
        {rsvpPhoto && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fitWidthUrl(rsvpPhoto, 2000)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            {/* Softly darkened so the invitation stays readable over any photo. */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--inverse-background)]/85 to-[var(--inverse-background)]/35" />
          </>
        )}
        <div className="relative">
          <p className={`text-[9px] tracking-[0.45em] uppercase mb-6 ${rsvpPhoto ? 'text-white/70' : 'text-white/30'}`}>You&apos;re invited</p>
          <h2 className="font-serif text-4xl md:text-6xl text-white mb-10">Will you join us?</h2>
          <Link
            href="/rsvp"
            className={`inline-block border text-white text-[10px] tracking-[0.35em] uppercase px-12 py-4 hover:bg-white hover:text-[var(--foreground)] transition-all duration-300 ${rsvpPhoto ? 'border-white/60' : 'border-white/30'}`}
          >
            RSVP Now
          </Link>
        </div>
      </section>

    </div>
  );
}
