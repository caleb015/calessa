'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/adminApi';
import { RxArrowLeft, RxCopy, RxExternalLink } from 'react-icons/rx';
import SearchableSelect from '@/components/dashboard/SearchableSelect';

interface SeatingTable {
  id: string;
  tableNumber: number | null;
  name: string | null;
  capacity: number | null;
}

interface SeatingAssignment {
  id: string;
  tableId: string;
  seatLabel: string | null;
  notes: string | null;
  table: SeatingTable;
}

interface Rsvp {
  id: string;
  status: 'PENDING' | 'ATTENDING' | 'DECLINED' | 'MAYBE';
  attendeeCount: number;
  email: string | null;
  phone: string | null;
  plusOneName: string | null;
  mealPreference: string | null;
  dietaryRestrictions: string | null;
  message: string | null;
  songRequest: string | null;
  submittedAt: string;
  updatedAt: string;
}

interface Guest {
  id: string;
  primaryName: string;
  email: string | null;
  phone: string | null;
  group: string | null;
  allowedPartySize: number;
  plusOneAllowed: boolean;
  requiresMealSelection: boolean;
  invitationCode: string;
  notes: string | null;
  rsvp: Rsvp | null;
  seatingAssignment: SeatingAssignment | null;
}

const RSVP_STATUS_COLORS: Record<string, string> = {
  ATTENDING: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',
  MAYBE: 'bg-yellow-100 text-yellow-700',
  PENDING: 'bg-gray-100 text-gray-500',
};

const STATUSES = ['PENDING', 'ATTENDING', 'DECLINED', 'MAYBE'];

function tableLabel(t: { tableNumber: number | null; name: string | null }) {
  if (t.tableNumber && t.name) return `Table ${t.tableNumber} — ${t.name}`;
  if (t.tableNumber) return `Table ${t.tableNumber}`;
  if (t.name) return t.name;
  return 'Unnamed Table';
}

const inputClass = 'border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 w-full';
const cardClass = 'bg-white border border-gray-200 rounded-lg p-5';
const labelClass = 'block text-xs text-gray-500 mb-1';
const btn = 'px-4 py-2 rounded-md text-sm transition-all cursor-pointer select-none active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';
const btnPrimary = `${btn} bg-gray-900 text-white hover:bg-gray-700`;
const btnSecondary = `${btn} border border-gray-200 text-gray-600 hover:bg-gray-50`;
const btnDanger = `${btn} border border-gray-200 text-red-500 hover:bg-red-50`;

export default function GuestDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [guest, setGuest] = useState<Guest | null>(null);
  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  const [profileForm, setProfileForm] = useState<Partial<Guest>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [rsvpForm, setRsvpForm] = useState<Partial<Rsvp>>({});
  const [savingRsvp, setSavingRsvp] = useState(false);
  const [rsvpError, setRsvpError] = useState('');

  const [seatTableId, setSeatTableId] = useState('');
  const [seatLabel, setSeatLabel] = useState('');
  const [seatNotes, setSeatNotes] = useState('');
  const [savingSeat, setSavingSeat] = useState(false);
  const [seatError, setSeatError] = useState('');

  const load = useCallback(() => {
    Promise.all([
      adminApi.getGuest(id) as Promise<Guest>,
      adminApi.getSeatingTables() as Promise<SeatingTable[]>,
    ])
      .then(([g, t]) => {
        setGuest(g);
        setTables(t);
        setProfileForm({
          primaryName: g.primaryName,
          email: g.email ?? '',
          phone: g.phone ?? '',
          group: g.group ?? '',
          allowedPartySize: g.allowedPartySize,
          plusOneAllowed: g.plusOneAllowed,
          requiresMealSelection: g.requiresMealSelection,
          invitationCode: g.invitationCode,
          notes: g.notes ?? '',
        });
        if (g.rsvp) {
          setRsvpForm({
            status: g.rsvp.status,
            attendeeCount: g.rsvp.attendeeCount,
            email: g.rsvp.email ?? '',
            phone: g.rsvp.phone ?? '',
            plusOneName: g.rsvp.plusOneName ?? '',
            mealPreference: g.rsvp.mealPreference ?? '',
            dietaryRestrictions: g.rsvp.dietaryRestrictions ?? '',
            message: g.rsvp.message ?? '',
            songRequest: g.rsvp.songRequest ?? '',
          });
        }
        setSeatTableId(g.seatingAssignment?.tableId ?? '');
        setSeatLabel(g.seatingAssignment?.seatLabel ?? '');
        setSeatNotes(g.seatingAssignment?.notes ?? '');
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const copyRsvpLink = () => {
    if (!guest) return;
    navigator.clipboard.writeText(`${window.location.origin}/rsvp/${guest.invitationCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError('');
    try {
      await adminApi.updateGuest(id, profileForm);
      load();
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveRsvp = async () => {
    if (!guest?.rsvp) return;
    setSavingRsvp(true);
    setRsvpError('');
    try {
      await adminApi.updateRsvp(guest.rsvp.id, rsvpForm);
      load();
    } catch (err: unknown) {
      setRsvpError(err instanceof Error ? err.message : 'Failed to save RSVP');
    } finally {
      setSavingRsvp(false);
    }
  };

  const handleSaveSeat = async () => {
    if (!seatTableId) return;
    setSavingSeat(true);
    setSeatError('');
    try {
      if (guest?.seatingAssignment) {
        await adminApi.updateSeatingAssignment(guest.seatingAssignment.id, {
          tableId: seatTableId,
          seatLabel: seatLabel || undefined,
          notes: seatNotes || undefined,
        });
      } else {
        await adminApi.createSeatingAssignment({
          guestId: id,
          tableId: seatTableId,
          seatLabel: seatLabel || undefined,
          notes: seatNotes || undefined,
        });
      }
      load();
    } catch (err: unknown) {
      setSeatError(err instanceof Error ? err.message : 'Failed to save seating assignment');
    } finally {
      setSavingSeat(false);
    }
  };

  const handleUnassign = async () => {
    if (!guest?.seatingAssignment) return;
    setSavingSeat(true);
    setSeatError('');
    try {
      await adminApi.deleteSeatingAssignment(guest.seatingAssignment.id);
      setSeatTableId('');
      setSeatLabel('');
      setSeatNotes('');
      load();
    } catch (err: unknown) {
      setSeatError(err instanceof Error ? err.message : 'Failed to unassign');
    } finally {
      setSavingSeat(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading...</div>;

  if (notFound || !guest) {
    return (
      <div className="p-8">
        <Link href="/dashboard/guests" className="text-sm text-gray-500 hover:text-gray-900 inline-flex items-center gap-1.5 mb-6">
          <RxArrowLeft size={14} /> Back to Guests
        </Link>
        <p className="text-sm text-gray-400">Guest not found.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/dashboard/guests" className="text-sm text-gray-500 hover:text-gray-900 inline-flex items-center gap-1.5 mb-6">
        <RxArrowLeft size={14} /> Back to Guests
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{guest.primaryName}</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="font-mono text-xs text-gray-500">{guest.invitationCode}</span>
            {guest.group && <span className="text-xs text-gray-400">· {guest.group}</span>}
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${RSVP_STATUS_COLORS[guest.rsvp?.status ?? 'PENDING']}`}>
              {guest.rsvp?.status ?? 'PENDING'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={copyRsvpLink} className={`${btnSecondary} flex items-center gap-1.5`}>
            <RxCopy size={13} /> {copied ? 'Copied!' : 'Copy RSVP link'}
          </button>
          <a
            href={`/rsvp/${guest.invitationCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnSecondary} flex items-center gap-1.5`}
          >
            <RxExternalLink size={13} /> View RSVP page
          </a>
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <div className={cardClass}>
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Profile</h2>
          {profileError && <p className="text-xs text-red-500 mb-3">{profileError}</p>}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={labelClass}>Full name</label>
              <input className={inputClass} value={(profileForm.primaryName as string) ?? ''} onChange={e => setProfileForm(f => ({ ...f, primaryName: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input className={inputClass} type="email" value={(profileForm.email as string) ?? ''} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input className={inputClass} value={(profileForm.phone as string) ?? ''} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Group</label>
              <input className={inputClass} value={(profileForm.group as string) ?? ''} onChange={e => setProfileForm(f => ({ ...f, group: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Allowed party size</label>
              <input className={inputClass} type="number" min={1} value={(profileForm.allowedPartySize as number) ?? 1} onChange={e => setProfileForm(f => ({ ...f, allowedPartySize: +e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Invitation code</label>
              <input className={`${inputClass} font-mono`} value={(profileForm.invitationCode as string) ?? ''} onChange={e => setProfileForm(f => ({ ...f, invitationCode: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-4 mb-3 text-sm text-gray-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={Boolean(profileForm.plusOneAllowed)} onChange={e => setProfileForm(f => ({ ...f, plusOneAllowed: e.target.checked }))} />
              Plus-one allowed
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={Boolean(profileForm.requiresMealSelection)} onChange={e => setProfileForm(f => ({ ...f, requiresMealSelection: e.target.checked }))} />
              Requires meal selection
            </label>
          </div>
          <div className="mb-4">
            <label className={labelClass}>Notes</label>
            <textarea className={`${inputClass} resize-none`} rows={2} value={(profileForm.notes as string) ?? ''} onChange={e => setProfileForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <button onClick={handleSaveProfile} disabled={savingProfile} className={btnPrimary}>
            {savingProfile ? 'Saving…' : 'Save Profile'}
          </button>
        </div>

        {/* RSVP */}
        <div className={cardClass}>
          <h2 className="text-sm font-semibold text-gray-700 mb-4">RSVP Details</h2>
          {!guest.rsvp ? (
            <p className="text-sm text-gray-400">This guest hasn&apos;t submitted an RSVP yet.</p>
          ) : (
            <>
              {rsvpError && <p className="text-xs text-red-500 mb-3">{rsvpError}</p>}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={labelClass}>Status</label>
                  <select className={inputClass} value={(rsvpForm.status as string) ?? 'PENDING'} onChange={e => setRsvpForm(f => ({ ...f, status: e.target.value as Rsvp['status'] }))}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Attendee count</label>
                  <input className={inputClass} type="number" min={0} value={(rsvpForm.attendeeCount as number) ?? 0} onChange={e => setRsvpForm(f => ({ ...f, attendeeCount: +e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input className={inputClass} type="email" value={(rsvpForm.email as string) ?? ''} onChange={e => setRsvpForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input className={inputClass} value={(rsvpForm.phone as string) ?? ''} onChange={e => setRsvpForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Plus-one name</label>
                  <input className={inputClass} value={(rsvpForm.plusOneName as string) ?? ''} onChange={e => setRsvpForm(f => ({ ...f, plusOneName: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Meal preference</label>
                  <input className={inputClass} value={(rsvpForm.mealPreference as string) ?? ''} onChange={e => setRsvpForm(f => ({ ...f, mealPreference: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Dietary restrictions</label>
                  <input className={inputClass} value={(rsvpForm.dietaryRestrictions as string) ?? ''} onChange={e => setRsvpForm(f => ({ ...f, dietaryRestrictions: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Song request</label>
                  <input className={inputClass} value={(rsvpForm.songRequest as string) ?? ''} onChange={e => setRsvpForm(f => ({ ...f, songRequest: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Message</label>
                  <textarea className={`${inputClass} resize-none`} rows={2} value={(rsvpForm.message as string) ?? ''} onChange={e => setRsvpForm(f => ({ ...f, message: e.target.value }))} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Submitted {new Date(guest.rsvp.submittedAt).toLocaleString()} · Last updated {new Date(guest.rsvp.updatedAt).toLocaleString()}
              </p>
              <button onClick={handleSaveRsvp} disabled={savingRsvp} className={btnPrimary}>
                {savingRsvp ? 'Saving…' : 'Save RSVP'}
              </button>
            </>
          )}
        </div>

        {/* Seating */}
        <div className={cardClass}>
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Seating Assignment</h2>
          {seatError && <p className="text-xs text-red-500 mb-3">{seatError}</p>}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={labelClass}>Table</label>
              <SearchableSelect
                value={seatTableId}
                onChange={setSeatTableId}
                placeholder="Select table…"
                options={tables.map(t => ({
                  value: t.id,
                  label: tableLabel(t),
                  meta: t.capacity ? `Seats ${t.capacity}` : undefined,
                }))}
              />
            </div>
            <div>
              <label className={labelClass}>Seat label</label>
              <input className={inputClass} placeholder="e.g. Seat 3" value={seatLabel} onChange={e => setSeatLabel(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Notes</label>
              <input className={inputClass} value={seatNotes} onChange={e => setSeatNotes(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveSeat} disabled={savingSeat || !seatTableId} className={btnPrimary}>
              {savingSeat ? 'Saving…' : guest.seatingAssignment ? 'Update Assignment' : 'Assign to Table'}
            </button>
            {guest.seatingAssignment && (
              <button onClick={handleUnassign} disabled={savingSeat} className={btnDanger}>
                Unassign
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
