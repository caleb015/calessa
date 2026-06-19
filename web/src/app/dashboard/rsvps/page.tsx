'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/adminApi';
import { RxPencil1, RxTrash } from 'react-icons/rx';

interface Rsvp {
  id: string;
  status: string;
  attendeeCount: number;
  email: string | null;
  plusOneName: string | null;
  mealPreference: string | null;
  dietaryRestrictions: string | null;
  message: string | null;
  songRequest: string | null;
  submittedAt: string;
  guest: { id: string; primaryName: string; invitationCode: string };
}

const STATUS_COLORS: Record<string, string> = {
  ATTENDING: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',
  MAYBE: 'bg-yellow-100 text-yellow-700',
  PENDING: 'bg-gray-100 text-gray-500',
};

const ALL_STATUSES = ['ATTENDING', 'DECLINED', 'MAYBE', 'PENDING'];

export default function RsvpsPage() {
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [allowMaybe, setAllowMaybe] = useState(true);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Rsvp>>({});
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const STATUSES = allowMaybe ? ALL_STATUSES : ALL_STATUSES.filter(s => s !== 'MAYBE');

  const load = useCallback(() => {
    adminApi.getRsvps()
      .then(data => { setRsvps(data as Rsvp[]); setLoading(false); })
      .catch(() => setLoading(false));
    adminApi.getSettings()
      .then(data => setAllowMaybe(Boolean((data as { allowMaybe?: boolean }).allowMaybe)))
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filterStatus ? rsvps.filter(r => r.status === filterStatus) : rsvps;

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this RSVP?')) return;
    await adminApi.deleteRsvp(id);
    load();
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    await adminApi.updateRsvp(editingId, editForm);
    setSaving(false);
    setEditingId(null);
    load();
  };

  const inputClass = 'border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 w-full';

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">RSVPs</h1>
        <a
          href={adminApi.exportRsvpsCsv()}
          download="rsvps.csv"
          className="border border-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
        >
          Export CSV
        </a>
      </div>

      {/* Filters + counts */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {['', ...STATUSES].map(s => {
          const count = s ? rsvps.filter(r => r.status === s).length : rsvps.length;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filterStatus === s ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s || 'All'} ({count})
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Guest</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Guests</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Meal</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Submitted</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No RSVPs yet.</td></tr>
            )}
            {filtered.map(rsvp => (
              <React.Fragment key={rsvp.id}>
                <tr
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setExpanded(expanded === rsvp.id ? null : rsvp.id)}
                >
                  <td className="px-4 py-3 text-gray-900 font-medium">{rsvp.guest.primaryName}</td>
                  <td className="px-4 py-3">
                    {editingId === rsvp.id ? (
                      <select className={inputClass} value={(editForm.status as string) ?? rsvp.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[rsvp.status]}`}>{rsvp.status}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{rsvp.attendeeCount}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{rsvp.mealPreference ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(rsvp.submittedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end" onClick={e => e.stopPropagation()}>
                      {editingId === rsvp.id ? (
                        <>
                          <button onClick={handleSaveEdit} disabled={saving} className="text-xs bg-gray-900 text-white px-3 py-1 rounded disabled:opacity-50">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-xs border border-gray-200 px-3 py-1 rounded text-gray-600">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(rsvp.id); setEditForm({ status: rsvp.status, attendeeCount: rsvp.attendeeCount }); }} className="text-gray-400 hover:text-gray-700">
                            <RxPencil1 size={14} />
                          </button>
                          <button onClick={() => handleDelete(rsvp.id)} className="text-gray-400 hover:text-red-500">
                            <RxTrash size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                {expanded === rsvp.id && (
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-600">
                        <div><span className="text-gray-400 block">Email</span>{rsvp.email ?? '—'}</div>
                        <div><span className="text-gray-400 block">Plus-one</span>{rsvp.plusOneName ?? '—'}</div>
                        <div><span className="text-gray-400 block">Dietary</span>{rsvp.dietaryRestrictions ?? '—'}</div>
                        <div><span className="text-gray-400 block">Song request</span>{rsvp.songRequest ?? '—'}</div>
                        {rsvp.message && <div className="col-span-4"><span className="text-gray-400 block">Message</span>{rsvp.message}</div>}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
