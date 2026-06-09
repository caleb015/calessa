'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/adminApi';
import { RxTrash, RxPlus, RxPerson } from 'react-icons/rx';
import SearchableSelect from '@/components/dashboard/SearchableSelect';

interface Guest {
  id: string;
  primaryName: string;
  invitationCode: string;
  rsvp: { status: string; attendeeCount: number } | null;
}

interface Assignment {
  id: string;
  guestId: string;
  seatLabel: string | null;
  guest: { id: string; primaryName: string };
}

interface Table {
  id: string;
  tableNumber: number | null;
  name: string | null;
  capacity: number | null;
  notes: string | null;
  assignments: Assignment[];
}

interface SeatingSettings {
  requireUniqueTableNumbers: boolean;
  requireUniqueTableNames: boolean;
}

function tableLabel(t: { tableNumber: number | null; name: string | null }) {
  if (t.tableNumber && t.name) return `Table ${t.tableNumber} — ${t.name}`;
  if (t.tableNumber) return `Table ${t.tableNumber}`;
  if (t.name) return t.name;
  return 'Unnamed Table';
}

const btnBase = 'px-4 py-2 rounded-md text-sm transition-all cursor-pointer select-none active:scale-95';
const inputClass = 'border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 w-full';

export default function SeatingPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [unassigned, setUnassigned] = useState<Guest[]>([]);
  const [settings, setSettings] = useState<SeatingSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Table form
  const [showAddTable, setShowAddTable] = useState(false);
  const [tableForm, setTableForm] = useState({ tableNumber: '', name: '', capacity: '', notes: '' });
  const [editTableId, setEditTableId] = useState<string | null>(null);
  const [editTableForm, setEditTableForm] = useState({ tableNumber: '', name: '', capacity: '', notes: '' });

  // Assignment form
  const [assigningTableId, setAssigningTableId] = useState<string | null>(null);
  const [assignGuestId, setAssignGuestId] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [t, u, s] = await Promise.all([
      adminApi.getSeatingTables() as Promise<Table[]>,
      adminApi.getUnassignedGuests() as Promise<Guest[]>,
      adminApi.getSettings() as Promise<SeatingSettings>,
    ]);
    setTables(t);
    setUnassigned(u);
    setSettings({ requireUniqueTableNumbers: s.requireUniqueTableNumbers, requireUniqueTableNames: s.requireUniqueTableNames });
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await adminApi.createSeatingTable({
        tableNumber: tableForm.tableNumber ? +tableForm.tableNumber : undefined,
        name: tableForm.name || undefined,
        capacity: tableForm.capacity ? +tableForm.capacity : undefined,
        notes: tableForm.notes || undefined,
      });
      setTableForm({ tableNumber: '', name: '', capacity: '', notes: '' });
      setShowAddTable(false);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add table');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTable = async (id: string) => {
    setSaving(true);
    setError('');
    try {
      await adminApi.updateSeatingTable(id, {
        tableNumber: editTableForm.tableNumber ? +editTableForm.tableNumber : null,
        name: editTableForm.name || null,
        capacity: editTableForm.capacity ? +editTableForm.capacity : null,
        notes: editTableForm.notes || null,
      });
      setEditTableId(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update table');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSetting = async (key: keyof SeatingSettings, value: boolean) => {
    setError('');
    try {
      await adminApi.updateSettings({ [key]: value });
      setSettings(s => (s ? { ...s, [key]: value } : s));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update setting');
    }
  };

  const handleDeleteTable = async (id: string, name: string) => {
    if (!confirm(`Delete table "${name}"? All assignments will be removed.`)) return;
    await adminApi.deleteSeatingTable(id);
    load();
  };

  const handleAssign = async (tableId: string) => {
    if (!assignGuestId) return;
    setSaving(true);
    setError('');
    try {
      await adminApi.createSeatingAssignment({ guestId: assignGuestId, tableId });
      setAssignGuestId('');
      setAssigningTableId(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to assign guest');
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async (assignmentId: string) => {
    await adminApi.deleteSeatingAssignment(assignmentId);
    load();
  };

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading...</div>;

  const totalSeated = tables.reduce((sum, t) => sum + t.assignments.length, 0);
  const totalCapacity = tables.reduce((sum, t) => sum + (t.capacity ?? 0), 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Seating</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {totalSeated} seated · {unassigned.length} unassigned
            {totalCapacity > 0 && ` · ${totalCapacity} total capacity`}
          </p>
        </div>
        <button
          onClick={() => setShowAddTable(!showAddTable)}
          className={`${btnBase} bg-gray-900 text-white hover:bg-gray-700 active:bg-gray-600 flex items-center gap-2`}
        >
          <RxPlus size={14} /> Add Table
        </button>
      </div>

      {settings && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4 text-sm text-gray-600">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              className="cursor-pointer"
              checked={settings.requireUniqueTableNumbers}
              onChange={e => handleToggleSetting('requireUniqueTableNumbers', e.target.checked)}
            />
            Require unique table numbers
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              className="cursor-pointer"
              checked={settings.requireUniqueTableNames}
              onChange={e => handleToggleSetting('requireUniqueTableNames', e.target.checked)}
            />
            Require unique table names
          </label>
        </div>
      )}

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* Add table form */}
      {showAddTable && (
        <form onSubmit={handleAddTable} className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">New Table</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Table # <span className="text-gray-400">(optional)</span></label>
              <input className={inputClass} type="number" min={1} placeholder="e.g. 5" value={tableForm.tableNumber} onChange={e => setTableForm(f => ({ ...f, tableNumber: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name <span className="text-gray-400">(optional)</span></label>
              <input className={inputClass} placeholder="e.g. Head Table" value={tableForm.name} onChange={e => setTableForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Capacity</label>
              <input className={inputClass} type="number" min={1} placeholder="Seats" value={tableForm.capacity} onChange={e => setTableForm(f => ({ ...f, capacity: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notes</label>
              <input className={inputClass} placeholder="Optional" value={tableForm.notes} onChange={e => setTableForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className={`${btnBase} bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50`}>
              {saving ? 'Adding…' : 'Add Table'}
            </button>
            <button type="button" onClick={() => setShowAddTable(false)} className={`${btnBase} border border-gray-200 text-gray-600 hover:bg-gray-100`}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {tables.map(table => (
          <div key={table.id} className="bg-white border border-gray-200 rounded-lg">
            {/* Table header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between rounded-t-lg">
              {editTableId === table.id ? (
                <div className="flex gap-2 flex-1 min-w-0 mr-2">
                  <input
                    autoFocus
                    className="border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 w-14 shrink-0"
                    type="number"
                    min={1}
                    placeholder="#"
                    title="Table number"
                    value={editTableForm.tableNumber}
                    onChange={e => setEditTableForm(f => ({ ...f, tableNumber: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleUpdateTable(table.id); if (e.key === 'Escape') setEditTableId(null); }}
                  />
                  <input
                    className="border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 flex-1 min-w-0"
                    placeholder="Name (optional)"
                    value={editTableForm.name}
                    onChange={e => setEditTableForm(f => ({ ...f, name: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleUpdateTable(table.id); if (e.key === 'Escape') setEditTableId(null); }}
                  />
                  <input
                    className="border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 w-14 shrink-0"
                    type="number"
                    min={1}
                    placeholder="Cap"
                    title="Capacity"
                    value={editTableForm.capacity}
                    onChange={e => setEditTableForm(f => ({ ...f, capacity: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleUpdateTable(table.id); if (e.key === 'Escape') setEditTableId(null); }}
                  />
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium text-gray-900 text-sm cursor-pointer select-none hover:text-gray-600 transition-colors"
                    title="Double-click to edit"
                    onDoubleClick={() => {
                      setEditTableId(table.id);
                      setEditTableForm({
                        tableNumber: table.tableNumber?.toString() ?? '',
                        name: table.name ?? '',
                        capacity: table.capacity?.toString() ?? '',
                        notes: table.notes ?? '',
                      });
                    }}
                  >
                    {tableLabel(table)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {table.assignments.length}{table.capacity ? `/${table.capacity}` : ''} seated
                  </p>
                </div>
              )}
              <div className="flex gap-1.5 shrink-0">
                {editTableId === table.id ? (
                  <>
                    <button
                      onClick={() => handleUpdateTable(table.id)}
                      disabled={saving}
                      className="text-xs bg-gray-900 text-white px-2.5 py-1 rounded disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditTableId(null)}
                      className="text-xs border border-gray-200 px-2.5 py-1 rounded text-gray-600"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleDeleteTable(table.id, tableLabel(table))}
                    className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                  >
                    <RxTrash size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Assigned guests */}
            <div className="px-4 py-2 min-h-[60px]">
              {table.assignments.length === 0 && (
                <p className="text-xs text-gray-300 py-2">No guests assigned</p>
              )}
              {table.assignments.map(a => (
                <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <RxPerson size={12} className="text-gray-400" />
                    <span className="text-sm text-gray-700">{a.guest.primaryName}</span>
                    {a.seatLabel && <span className="text-xs text-gray-400">· {a.seatLabel}</span>}
                  </div>
                  <button onClick={() => handleUnassign(a.id)} className="text-gray-300 hover:text-red-400 transition-colors text-xs ml-2">✕</button>
                </div>
              ))}
            </div>

            {/* Assign guest */}
            {assigningTableId === table.id ? (
              <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
                <SearchableSelect
                  className="flex-1"
                  value={assignGuestId}
                  onChange={setAssignGuestId}
                  placeholder="Select guest…"
                  options={unassigned
                    .filter(g => g.rsvp?.status === 'ATTENDING' || !g.rsvp)
                    .map(g => ({
                      value: g.id,
                      label: g.primaryName,
                      meta: g.rsvp?.status === 'ATTENDING' ? `${g.rsvp.attendeeCount} attending` : 'No RSVP',
                    }))
                  }
                />
                <button onClick={() => handleAssign(table.id)} disabled={saving || !assignGuestId} className={`${btnBase} bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 px-3 py-1.5`}>
                  Assign
                </button>
                <button onClick={() => { setAssigningTableId(null); setAssignGuestId(''); }} className={`${btnBase} border border-gray-200 text-gray-600 hover:bg-gray-100 px-3 py-1.5`}>
                  ✕
                </button>
              </div>
            ) : (
              <div className="px-4 py-2 border-t border-gray-50">
                <button
                  onClick={() => setAssigningTableId(table.id)}
                  className="text-xs text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1"
                >
                  <RxPlus size={11} /> Assign guest
                </button>
              </div>
            )}
          </div>
        ))}

        {tables.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-400 text-sm bg-white border border-dashed border-gray-200 rounded-lg">
            No tables yet. Add your first table to get started.
          </div>
        )}
      </div>

      {/* Unassigned guests */}
      {unassigned.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Unassigned Guests ({unassigned.length})</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {unassigned.map(guest => (
              <div key={guest.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">{guest.primaryName}</p>
                  {guest.rsvp && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {guest.rsvp.status} · {guest.rsvp.attendeeCount} attending
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  guest.rsvp?.status === 'ATTENDING' ? 'bg-green-100 text-green-700' :
                  guest.rsvp?.status === 'DECLINED' ? 'bg-red-100 text-red-600' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {guest.rsvp?.status ?? 'PENDING'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
