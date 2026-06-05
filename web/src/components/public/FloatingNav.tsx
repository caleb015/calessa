'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

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

export default function FloatingNav({ coupleNames }: { coupleNames?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on route change
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className={`
          fixed top-5 right-5 z-[60] w-11 h-11 flex flex-col items-center justify-center gap-[5px]
          transition-all duration-300
        `}
      >
        <span className={`block w-6 h-px transition-all duration-300 origin-center
          ${open ? 'bg-white rotate-45 translate-y-[6px]' : 'bg-[var(--foreground)]'}`} />
        <span className={`block h-px transition-all duration-300
          ${open ? 'bg-white w-0 opacity-0' : 'bg-[var(--foreground)] w-6'}`} />
        <span className={`block w-6 h-px transition-all duration-300 origin-center
          ${open ? 'bg-white -rotate-45 -translate-y-[6px]' : 'bg-[var(--foreground)]'}`} />
      </button>

      {/* Full-screen overlay */}
      <div
        className={`
          fixed inset-0 z-50 flex flex-col items-center justify-center
          transition-all duration-500
          ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        style={{ backgroundColor: 'rgba(30, 24, 20, 0.97)' }}
        onClick={() => setOpen(false)}
      >
        {/* Couple names at top */}
        <p className="absolute top-8 left-1/2 -translate-x-1/2 font-serif text-white/40 text-sm tracking-[0.3em] uppercase whitespace-nowrap">
          {coupleNames ?? 'Caleb & Raissa'}
        </p>

        {/* Nav links */}
        <nav className="flex flex-col items-center gap-2" onClick={e => e.stopPropagation()}>
          {links.map(({ href, label }, i) => (
            <Link
              key={href}
              href={href}
              className={`
                font-serif text-3xl md:text-5xl transition-all duration-200
                ${pathname === href ? 'text-[var(--accent)]' : 'text-white hover:text-[var(--accent)]'}
              `}
              style={{
                transitionDelay: open ? `${i * 40}ms` : '0ms',
                transform: open ? 'translateY(0)' : 'translateY(12px)',
                opacity: open ? 1 : 0,
              }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Subtle close hint */}
        <p className="absolute bottom-8 text-white/20 text-xs tracking-widest uppercase">
          Click anywhere to close
        </p>
      </div>
    </>
  );
}
