'use client';

import Link from 'next/link';
import RsvpForm from './RsvpForm';
import type { RsvpGuest, WeddingSettings } from '@/types/api';

interface Props {
  code: string;
  guest: RsvpGuest | null;
  settings: WeddingSettings | null;
  /** When provided, "Try another code" calls this instead of linking to /rsvp */
  onReset?: () => void;
}

export default function RsvpInvitationView({ code, guest, settings, onReset }: Props) {
  if (!guest) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <h1 className="font-serif text-3xl mb-4">Invitation Not Found</h1>
        <p className="text-[var(--muted)] mb-8">
          We couldn&apos;t find an invitation for that code. Please double-check and try again.
        </p>
        {onReset ? (
          <button onClick={onReset} className="text-sm text-[var(--accent)] underline underline-offset-4 cursor-pointer">
            ← Try another code
          </button>
        ) : (
          <Link href="/rsvp" className="text-sm text-[var(--accent)] underline underline-offset-4">
            ← Try another code
          </Link>
        )}
      </div>
    );
  }

  if (settings && !settings.isRsvpEnabled) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <h1 className="font-serif text-3xl mb-4">RSVPs Are Closed</h1>
        <p className="text-[var(--muted)]">
          We&apos;re no longer accepting RSVPs at this time. Please contact us if you need assistance.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)] mb-3">Your Invitation</p>
        <h1 className="font-serif text-4xl">Hello, {guest.primaryName}!</h1>
        {guest.rsvp && (
          <p className="mt-3 text-sm text-[var(--muted)]">
            You have already submitted an RSVP. You may update it below.
          </p>
        )}
      </div>

      <RsvpForm
        code={code}
        guest={guest}
        settings={{
          allowMaybe: settings?.allowMaybe ?? false,
          enableMealPreference: settings?.enableMealPreference ?? true,
          enableSongRequest: settings?.enableSongRequest ?? true,
        }}
      />
    </div>
  );
}
