'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const leftLinks = [
  { href: '/story', label: 'Our Story' },
  { href: '/details', label: 'Details' },
  { href: '/schedule', label: 'Schedule' },
];

const rightLinks = [
  { href: '/rsvp', label: 'RSVP' },
  { href: '/faq', label: 'FAQ' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/contact', label: 'Contact' },
];

export default function DesktopTopNav({ monogramUrl }: { monogramUrl: string }) {
  const pathname = usePathname();

  // Homepage has its own monogram nav overlaid on the hero image
  if (pathname === '/') return null;

  // RSVP page shows just the monogram, no links
  const isRsvp = pathname.startsWith('/rsvp');

  const linkClass = (href: string) =>
    `text-[11px] tracking-[0.25em] uppercase transition-colors ${
      pathname === href
        ? 'text-[var(--accent)]'
        : 'text-[var(--muted)] hover:text-[var(--foreground)]'
    }`;

  if (isRsvp) {
    return (
      <Link href="/" className="hidden md:flex fixed top-5 right-5 z-[60]">
        <Image src={monogramUrl} alt="Caleb & Raissa" width={68} height={68} className="opacity-90" />
      </Link>
    );
  }

  return (
    <nav className="hidden md:flex sticky top-0 z-40 items-center justify-center gap-10 px-10 py-4 bg-[var(--background)] border-b border-[var(--border)]">
      <div className="flex items-center gap-8">
        {leftLinks.map(({ href, label }) => (
          <Link key={href} href={href} className={linkClass(href)}>
            {label}
          </Link>
        ))}
      </div>
      <Link href="/">
        <Image src={monogramUrl} alt="Caleb & Raissa" width={68} height={68} className="opacity-90" />
      </Link>
      <div className="flex items-center gap-8">
        {rightLinks.map(({ href, label }) => (
          <Link key={href} href={href} className={linkClass(href)}>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
