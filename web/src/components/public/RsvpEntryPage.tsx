'use client';

import { useState } from 'react';
import Image from 'next/image';
import { publicApi } from '@/lib/api';
import RsvpInvitationView from './RsvpInvitationView';
import type { RsvpGuest, WeddingSettings } from '@/types/api';

type Phase = 'closed' | 'happy' | 'opening' | 'open';

const ANIMATION_MS = 600;

interface Props {
  initialCode?: string;
  coupleNames?: string;
  tagline?: string;
  subtext?: string;
}

export default function RsvpEntryPage({
  initialCode = '',
  coupleNames = 'Caleb & Raissa',
  tagline = "We can't wait to celebrate with you.",
  subtext = 'My Hoomans are tying the knot!!',
}: Props) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<Phase>('closed');
  const [revealCode, setRevealCode] = useState('');
  const [guest, setGuest] = useState<RsvpGuest | null>(null);
  const [settings, setSettings] = useState<WeddingSettings | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (phase !== 'closed') return;
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setError('Please enter your invitation code.'); return; }
    setError('');
    setRevealCode(trimmed);
    setPhase('happy');

    window.setTimeout(() => {
      setPhase('opening');

      Promise.all([
        publicApi.getRsvpByCode(trimmed).catch(() => null),
        publicApi.getSettings().catch(() => null),
      ]).then(([g, s]) => {
        setGuest(g);
        setSettings(s);
        setDataLoaded(true);
      });

      window.setTimeout(() => setPhase('open'), ANIMATION_MS);
    }, 1000);
  };

  const reset = () => {
    setPhase('closed');
    setCode('');
    setError('');
    setGuest(null);
    setSettings(null);
    setDataLoaded(false);
  };

  return (
    <div className="relative max-w-md mx-auto px-4 py-16 md:py-24 min-h-[80vh]">

      {/* Full-page background image — behind everything */}
      <div className="fixed inset-0 -z-10 object-[center_20%]">
        <Image src="/images/rsvp-bg.jpg" alt="" fill className="object-cover" />
      </div>


      {/* Invitation content — slides up from bottom after flowers part */}
      {phase === 'opening' || phase === 'open' ? (
        <div className={`transition-transform duration-700 ease-out ${phase === 'open' ? 'translate-y-0 delay-[700ms]' : 'translate-y-[100vh]'}`}>
          {dataLoaded ? (
            <RsvpInvitationView code={revealCode} guest={guest} settings={settings} onReset={reset} />
          ) : (
            <p className="text-center text-xs uppercase tracking-[0.3em] text-[var(--muted)] py-32">
              Opening your invitation…
            </p>
          )}
        </div>
      ) : null}

      {/* Odie entry form — z-20, above the flower curtains */}
      {phase !== 'open' && (
        <div className={`absolute inset-0 text-center z-20 pt-8 px-4 ${phase !== 'closed' ? 'pointer-events-none' : ''}`}>

          {/* Couple names + tagline at top */}
          <div className={`mb-4 transition-opacity duration-300 ${phase === 'opening' ? 'opacity-0' : ''}`}>
            <p className="font-serif text-3xl mt-0.5">{coupleNames}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">{tagline}</p>
          </div>

          <p className={`text-xs uppercase tracking-[0.3em] text-[var(--muted)] mb-2 transition-opacity duration-300 ${phase === 'opening' ? 'opacity-0' : ''}`}>
            You&apos;re Invited
          </p>
          <h1 className={`text-3xl md:text-4xl font-serif mb-0 transition-opacity duration-300 ${phase === 'opening' ? 'opacity-0' : ''}`}>
            RSVP
          </h1>

          <form onSubmit={handleSubmit}>
            {/* Bob wrapper — hover-triggered when closed, always on when happy */}
            <div className={`relative group ${
              phase === 'happy'
                ? 'animate-[mascotBob_1.2s_ease-in-out_infinite]'
                : phase === 'closed'
                ? 'has-[button:hover]:animate-[mascotBob_1.2s_ease-in-out_infinite]'
                : ''
            }`}>

              <div
                className={`relative mx-auto w-full aspect-square transition-all duration-500 drop-shadow-xl ${
                  phase === 'opening' ? 'scale-110 -translate-y-6 opacity-0' : ''
                }`}
              >
                <Image src="/images/odie.png" alt="Odie" fill className={`object-contain transition-opacity duration-150 ${
                  phase !== 'closed' ? 'opacity-0' : 'group-has-[button:hover]:opacity-0'
                }`} priority />
                <Image src="/images/odie-happy.png" alt="Odie happy" fill className={`object-contain transition-opacity duration-150 ${
                  phase === 'closed' ? 'opacity-0 group-has-[button:hover]:opacity-100' : ''
                }`} priority />

                {/* Invisible nose hotspot — only active when closed */}
                {phase === 'closed' && (
                  <button
                    type="submit"
                    aria-label="Boop Odie's nose to open your invitation"
                    className="absolute left-[52%] top-[59%] -translate-x-1/2 -translate-y-1/2 w-20 h-16 hover:w-24 hover:h-34 rounded-full cursor-pointer transition-all duration-150 "
                  />
                )}
              </div>
            </div>

            {/* Input + instruction — solid background so flowers don't bleed through */}
            <div className={`mt-4 transition-opacity duration-300 ${phase === 'opening' ? 'opacity-0' : ''} bg-[var(--background)] rounded-xl px-4 py-4 shadow-md`}>
              <p className="text-xl text-[var(--muted)] [font-family:'Slopes'] mb-3">{subtext}</p>
              <input
                type="text"
                value={code}
                onChange={e => { setCode(e.target.value); setError(''); }}
                placeholder="Your invitation code"
                aria-label="Invitation code"
                className="w-full bg-transparent border-b border-[var(--border)] text-center uppercase tracking-[0.3em] text-sm py-2 focus:outline-none focus:border-[var(--accent)] placeholder:normal-case placeholder:tracking-normal placeholder:text-[var(--muted)] transition-colors"
              />
              {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
              <p className="text-xs text-[var(--muted)] mt-3 tracking-wide">
                Boop Odie&apos;s nose to open your invitation
              </p>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
