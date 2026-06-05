'use client';

import { useState } from 'react';
import { publicApi, ApiError } from '@/lib/api';
import type { RsvpGuest } from '@/types/api';

interface Props {
  code: string;
  guest: RsvpGuest;
  settings: { allowMaybe: boolean; enableMealPreference: boolean; enableSongRequest: boolean };
}

type Status = 'ATTENDING' | 'DECLINED' | 'MAYBE';

export default function RsvpForm({ code, guest, settings }: Props) {
  const existing = guest.rsvp;

  const [status, setStatus] = useState<Status>((existing?.status as Status) ?? 'ATTENDING');
  const [attendeeCount, setAttendeeCount] = useState(existing?.attendeeCount ?? 1);
  const [email, setEmail] = useState(existing?.email ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [plusOneName, setPlusOneName] = useState(existing?.plusOneName ?? '');
  const [mealPreference, setMealPreference] = useState(existing?.mealPreference ?? '');
  const [dietaryRestrictions, setDietaryRestrictions] = useState(existing?.dietaryRestrictions ?? '');
  const [message, setMessage] = useState(existing?.message ?? '');
  const [songRequest, setSongRequest] = useState(existing?.songRequest ?? '');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const isAttending = status === 'ATTENDING' || status === 'MAYBE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await publicApi.submitRsvp(code, {
        status,
        attendeeCount: isAttending ? attendeeCount : 0,
        email,
        phone: phone || undefined,
        plusOneName: (isAttending && guest.plusOneAllowed && plusOneName) ? plusOneName : undefined,
        mealPreference: (isAttending && guest.requiresMealSelection && settings.enableMealPreference && mealPreference) ? mealPreference : undefined,
        dietaryRestrictions: dietaryRestrictions || undefined,
        message: message || undefined,
        songRequest: (isAttending && settings.enableSongRequest && songRequest) ? songRequest : undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">{status === 'DECLINED' ? '💌' : '🎉'}</div>
        <h2 className="font-serif text-2xl mb-3">
          {status === 'DECLINED' ? 'We\'ll miss you!' : 'See you there!'}
        </h2>
        <p className="text-[var(--muted)]">
          {status === 'DECLINED'
            ? 'Your response has been recorded. Thank you for letting us know.'
            : 'Your RSVP has been submitted. We can\'t wait to celebrate with you!'}
        </p>
      </div>
    );
  }

  const inputClass = 'w-full border border-[var(--border)] px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] bg-white';
  const labelClass = 'block text-xs uppercase tracking-widest text-[var(--muted)] mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Attendance */}
      <div>
        <label className={labelClass}>Will you attend?</label>
        <div className="flex gap-3 flex-wrap">
          {(['ATTENDING', 'DECLINED', ...(settings.allowMaybe ? ['MAYBE'] : [])] as Status[]).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-5 py-2 text-sm border transition-colors ${
                status === s
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]'
              }`}
            >
              {s === 'ATTENDING' ? 'Joyfully Accept' : s === 'DECLINED' ? 'Regretfully Decline' : 'Maybe'}
            </button>
          ))}
        </div>
      </div>

      {/* Attendee count */}
      {isAttending && guest.allowedPartySize > 1 && (
        <div>
          <label className={labelClass}>Number of guests (max {guest.allowedPartySize})</label>
          <select
            value={attendeeCount}
            onChange={e => setAttendeeCount(Number(e.target.value))}
            className={inputClass}
          >
            {Array.from({ length: guest.allowedPartySize }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      )}

      {/* Plus one */}
      {isAttending && guest.plusOneAllowed && (
        <div>
          <label className={labelClass}>Plus-one name (optional)</label>
          <input type="text" value={plusOneName} onChange={e => setPlusOneName(e.target.value)} className={inputClass} placeholder="Guest name" />
        </div>
      )}

      {/* Email */}
      <div>
        <label className={labelClass}>Email address <span className="text-red-400">*</span></label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} placeholder="your@email.com" />
      </div>

      {/* Phone */}
      <div>
        <label className={labelClass}>Phone number (optional)</label>
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="+63 912 345 6789" />
      </div>

      {/* Meal preference */}
      {isAttending && guest.requiresMealSelection && settings.enableMealPreference && (
        <div>
          <label className={labelClass}>Meal preference <span className="text-red-400">*</span></label>
          <input type="text" value={mealPreference} onChange={e => setMealPreference(e.target.value)} className={inputClass} placeholder="e.g. Chicken, Fish, Vegetarian" />
        </div>
      )}

      {/* Dietary restrictions */}
      <div>
        <label className={labelClass}>Dietary restrictions / allergies (optional)</label>
        <input type="text" value={dietaryRestrictions} onChange={e => setDietaryRestrictions(e.target.value)} className={inputClass} placeholder="e.g. Gluten-free, Nut allergy" />
      </div>

      {/* Message */}
      <div>
        <label className={labelClass}>Message to the couple (optional)</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder="A heartfelt note..." />
      </div>

      {/* Song request */}
      {isAttending && settings.enableSongRequest && (
        <div>
          <label className={labelClass}>Song request (optional)</label>
          <input type="text" value={songRequest} onChange={e => setSongRequest(e.target.value)} className={inputClass} placeholder="Song title and artist" />
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[var(--accent)] text-white py-3 text-sm uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? 'Submitting…' : existing ? 'Update RSVP' : 'Submit RSVP'}
      </button>
    </form>
  );
}
