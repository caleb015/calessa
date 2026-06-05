'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { RxHamburgerMenu, RxCross2 } from 'react-icons/rx';

const links = [
  { href: '/', label: 'Home' },
  { href: '/story', label: 'Our Story' },
  { href: '/details', label: 'Details' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/rsvp', label: 'RSVP' },
  { href: '/faq', label: 'FAQ' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar({ coupleNames }: { coupleNames?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-[var(--background)] border-b border-[var(--border)] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif text-xl text-[var(--foreground)] tracking-wide">
          {coupleNames ?? 'Caleb & Raissa'}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-6">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm tracking-wide transition-colors ${
                pathname === href
                  ? 'text-[var(--accent)] font-medium'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-[var(--foreground)]"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <RxCross2 size={22} /> : <RxHamburgerMenu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="md:hidden border-t border-[var(--border)] bg-[var(--background)]">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`block px-4 py-3 text-sm border-b border-[var(--border)] transition-colors ${
                pathname === href
                  ? 'text-[var(--accent)] font-medium'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
