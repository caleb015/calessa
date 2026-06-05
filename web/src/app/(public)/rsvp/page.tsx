'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RsvpEntryPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setError('Please enter your invitation code.'); return; }
    router.push(`/rsvp/${trimmed}`);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)] mb-3">You&apos;re Invited</p>
      <h1 className="text-4xl md:text-5xl font-serif mb-6">RSVP</h1>
      <p className="text-[var(--muted)] mb-10 leading-relaxed">
        Enter the invitation code from your invitation to access your personal RSVP page.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={code}
          onChange={e => { setCode(e.target.value); setError(''); }}
          placeholder="Enter your invitation code"
          className="w-full border border-[var(--border)] px-4 py-3 text-center uppercase tracking-widest text-sm focus:outline-none focus:border-[var(--accent)] bg-white"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full bg-[var(--accent)] text-white py-3 text-sm uppercase tracking-widest hover:opacity-90 transition-opacity"
        >
          Find My Invitation
        </button>
      </form>
    </div>
  );
}
