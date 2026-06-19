'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/adminApi';
import { RxCopy, RxPencil1, RxTrash, RxPlus, RxMagnifyingGlass } from 'react-icons/rx';

interface Guest {
  id: string;
  primaryName: string;
  email: string | null;
  group: string | null;
  allowedPartySize: number;
  plusOneAllowed: boolean;
  requiresMealSelection: boolean;
  invitationCode: string;
  rsvp: { status: string } | null;
}

const RSVP_STATUS_COLORS: Record<string, string> = {
  ATTENDING: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',
  MAYBE: 'bg-yellow-100 text-yellow-700',
  PENDING: 'bg-gray-100 text-gray-500',
};


export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [allowMaybe, setAllowMaybe] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Guest>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ primaryName: '', email: '', group: '', allowedPartySize: 1, plusOneAllowed: false, requiresMealSelection: false });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ created: number; skipped: number } | null>(null);

  const load = useCallback(() => {
    adminApi.getGuests()
      .then(data => { setGuests(data as Guest[]); setLoading(false); })
      .catch(() => setLoading(false));
    adminApi.getSettings()
      .then(data => setAllowMaybe(Boolean((data as { allowMaybe?: boolean }).allowMaybe)))
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const groups = Array.from(new Set(guests.map(g => g.group).filter(Boolean))) as string[];

  const filtered = guests.filter(g => {
    const matchSearch = !search || g.primaryName.toLowerCase().includes(search.toLowerCase()) || g.invitationCode.toLowerCase().includes(search.toLowerCase());
    const matchGroup = !filterGroup || g.group === filterGroup;
    const matchStatus = !filterStatus || (g.rsvp?.status ?? 'PENDING') === filterStatus;
    return matchSearch && matchGroup && matchStatus;
  });

  const copyRsvpLink = (code: string) => {
    const link = `${window.location.origin}/rsvp/${code}`;
    navigator.clipboard.writeText(link);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete guest "${name}"?`)) return;
    await adminApi.deleteGuest(id);
    load();
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    await adminApi.updateGuest(editingId, editForm);
    setSaving(false);
    setEditingId(null);
    load();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await adminApi.createGuest(addForm);
    setSaving(false);
    setShowAdd(false);
    setAddForm({ primaryName: '', email: '', group: '', allowedPartySize: 1, plusOneAllowed: false, requiresMealSelection: false });
    load();
  };

  const handleBulkImport = async () => {
    const lines = bulkText.trim().split('\n').filter(Boolean);
    const guestList = lines.map(line => {
      const [primaryName, email, group] = line.split('\t').map(s => s.trim());
      return { primaryName, email: email || undefined, group: group || undefined };
    });
    setSaving(true);
    const result = await adminApi.bulkCreateGuests({ guests: guestList }) as { created: number; skipped: number };
    setSaving(false);
    setBulkResult(result);
    setBulkText('');
    load();
  };

  const inputClass = 'border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900';

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Guests</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowBulk(!showBulk)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-100 hover:border-gray-400 active:bg-gray-200 active:scale-95 transition-all cursor-pointer select-none">
            Bulk Import
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 active:bg-gray-600 active:scale-95 transition-all cursor-pointer select-none flex items-center gap-2">
            <RxPlus size={14} /> Add Guest
          </button>
        </div>
      </div>

      {/* Bulk import */}
      {showBulk && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Bulk Import</h2>
          <p className="text-xs text-gray-500 mb-3">Paste rows with tab-separated columns: <code className="bg-gray-100 px-1 rounded">Name ⇥ Email ⇥ Group</code></p>
          <textarea
            className={`${inputClass} w-full resize-none mb-3`}
            rows={5}
            placeholder={"Juan dela Cruz\tjuan@example.com\tFamily\nMaria Santos\tmaria@example.com\tFriends"}
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
          />
          {bulkResult && (
            <p className="text-sm text-green-600 mb-2">
              ✓ {bulkResult.created} created, {bulkResult.skipped} skipped
            </p>
          )}
          <button onClick={handleBulkImport} disabled={saving || !bulkText.trim()} className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 active:bg-gray-600 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100">
            {saving ? 'Importing…' : 'Import'}
          </button>
        </div>
      )}

      {/* Add guest form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">New Guest</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <input required className={inputClass} placeholder="Full name *" value={addForm.primaryName} onChange={e => setAddForm(f => ({ ...f, primaryName: e.target.value }))} />
            <input className={inputClass} placeholder="Email" type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} />
            <input className={inputClass} placeholder="Group (Family, Friends…)" value={addForm.group} onChange={e => setAddForm(f => ({ ...f, group: e.target.value }))} />
            <input className={inputClass} placeholder="Party size" type="number" min={1} value={addForm.allowedPartySize} onChange={e => setAddForm(f => ({ ...f, allowedPartySize: +e.target.value }))} />
          </div>
          <div className="flex gap-4 mb-4 text-sm text-gray-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={addForm.plusOneAllowed} onChange={e => setAddForm(f => ({ ...f, plusOneAllowed: e.target.checked }))} />
              Plus-one allowed
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={addForm.requiresMealSelection} onChange={e => setAddForm(f => ({ ...f, requiresMealSelection: e.target.checked }))} />
              Requires meal selection
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">
              {saving ? 'Saving…' : 'Add Guest'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="border border-gray-200 px-4 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <RxMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input className={`${inputClass} pl-7`} placeholder="Search name or code…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={inputClass} value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
          <option value="">All groups</option>
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className={inputClass} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {(allowMaybe ? ['ATTENDING', 'DECLINED', 'MAYBE', 'PENDING'] : ['ATTENDING', 'DECLINED', 'PENDING']).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-gray-400 self-center">{filtered.length} of {guests.length}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Group</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Code</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Party</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">RSVP</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No guests found.</td></tr>
            )}
            {filtered.map(guest => (
              editingId === guest.id ? (
                <tr key={guest.id} className="border-b border-gray-100 bg-blue-50">
                  <td className="px-4 py-2">
                    <input className={inputClass} value={(editForm.primaryName as string) ?? guest.primaryName} onChange={e => setEditForm(f => ({ ...f, primaryName: e.target.value }))} />
                  </td>
                  <td className="px-4 py-2">
                    <input className={inputClass} value={(editForm.group as string) ?? guest.group ?? ''} onChange={e => setEditForm(f => ({ ...f, group: e.target.value }))} />
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">{guest.invitationCode}</td>
                  <td className="px-4 py-2">
                    <input type="number" min={1} className={`${inputClass} w-16`} value={(editForm.allowedPartySize as number) ?? guest.allowedPartySize} onChange={e => setEditForm(f => ({ ...f, allowedPartySize: +e.target.value }))} />
                  </td>
                  <td className="px-4 py-2" />
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button onClick={handleSaveEdit} disabled={saving} className="text-xs bg-gray-900 text-white px-3 py-1 rounded disabled:opacity-50">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-xs border border-gray-200 px-3 py-1 rounded text-gray-600">Cancel</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={guest.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    <Link
                      href={`/dashboard/guests/${guest.id}`}
                      className="inline-block -mx-1.5 -my-0.5 px-1.5 py-0.5 rounded transition-colors hover:bg-gray-200 hover:underline underline-offset-2"
                    >
                      {guest.primaryName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{guest.group ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{guest.invitationCode}</td>
                  <td className="px-4 py-3 text-gray-600">{guest.allowedPartySize}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${RSVP_STATUS_COLORS[guest.rsvp?.status ?? 'PENDING']}`}>
                      {guest.rsvp?.status ?? 'PENDING'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => copyRsvpLink(guest.invitationCode)} title="Copy RSVP link" className="text-gray-400 hover:text-gray-700 transition-colors">
                        {copied === guest.invitationCode ? <span className="text-xs text-green-500">Copied!</span> : <RxCopy size={14} />}
                      </button>
                      <button onClick={() => { setEditingId(guest.id); setEditForm({ primaryName: guest.primaryName, group: guest.group ?? '', allowedPartySize: guest.allowedPartySize }); }} className="text-gray-400 hover:text-gray-700 transition-colors">
                        <RxPencil1 size={14} />
                      </button>
                      <button onClick={() => handleDelete(guest.id, guest.primaryName)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <RxTrash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>

      {/* CSV export */}
      <div className="mt-4">
        <a
          href={adminApi.exportGuestsCsv()}
          download="guests.csv"
          className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-900"
        >
          Export guests.csv
        </a>
      </div>
    </div>
  );
}
