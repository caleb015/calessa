'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminApi';
import ImagePreview from '@/components/dashboard/ImagePreview';
import InfoTooltip from '@/components/dashboard/InfoTooltip';

export default function SettingsPage() {
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    adminApi.getSettings()
      .then(data => { setForm(data as Record<string, unknown>); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const set = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const { id, createdAt, updatedAt, ...payload } = form;
      await adminApi.updateSettings(payload);
      setMsg({ type: 'success', text: 'Settings saved.' });
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading...</div>;

  const inputClass = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent';
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Wedding Settings</h1>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Couple */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">The Couple</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Name A</label>
              <input className={inputClass} value={(form.coupleNameA as string) ?? ''} onChange={e => set('coupleNameA', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Name B</label>
              <input className={inputClass} value={(form.coupleNameB as string) ?? ''} onChange={e => set('coupleNameB', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Dates</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Wedding Date</label>
              <input type="datetime-local" className={inputClass}
                value={form.weddingDate ? new Date(form.weddingDate as string).toISOString().slice(0, 16) : ''}
                onChange={e => set('weddingDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            </div>
            <div>
              <label className={labelClass}>RSVP Deadline</label>
              <input type="datetime-local" className={inputClass}
                value={form.rsvpDeadline ? new Date(form.rsvpDeadline as string).toISOString().slice(0, 16) : ''}
                onChange={e => set('rsvpDeadline', e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            </div>
          </div>
        </div>

        {/* Site */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Site Content</h2>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>
                Browser Tab Title
                <InfoTooltip text="Shown in the browser tab and as the title when this page is shared as a link preview." />
              </label>
              <input className={inputClass} value={(form.siteTitle as string) ?? ''} onChange={e => set('siteTitle', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>
                Browser Tab Description
                <InfoTooltip text="Shown beneath the title in search results and link previews when this page is shared — not displayed anywhere on the site itself." />
              </label>
              <input className={inputClass} value={(form.siteDescription as string) ?? ''} onChange={e => set('siteDescription', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Hero Image URL</label>
              <input className={inputClass} placeholder="/images/hero.png or https://..." value={(form.heroImageUrl as string) ?? ''} onChange={e => set('heroImageUrl', e.target.value)} />
              <ImagePreview src={(form.heroImageUrl as string) ?? ''} />
            </div>
            <div>
              <label className={labelClass}>Monogram URL</label>
              <input className={inputClass} placeholder="/images/monogram.png or https://..." value={(form.monogramUrl as string) ?? ''} onChange={e => set('monogramUrl', e.target.value)} />
              <ImagePreview src={(form.monogramUrl as string) ?? ''} />
            </div>
            <div>
              <label className={labelClass}>RSVP Page Tagline</label>
              <input className={inputClass} placeholder="We can't wait to celebrate with you." value={(form.rsvpTagline as string) ?? ''} onChange={e => set('rsvpTagline', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>RSVP Page Subtext</label>
              <input className={inputClass} placeholder="My Hoomans are tying the knot!!" value={(form.rsvpSubtext as string) ?? ''} onChange={e => set('rsvpSubtext', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Welcome Message</label>
              <textarea className={`${inputClass} resize-none`} rows={3} value={(form.welcomeMessage as string) ?? ''} onChange={e => set('welcomeMessage', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Feature Toggles</h2>
          <div className="space-y-3">
            {[
              { key: 'isPublic', label: 'Site is public' },
              { key: 'isRsvpEnabled', label: 'RSVPs open' },
              { key: 'allowMaybe', label: 'Allow "Maybe" response' },
              { key: 'enableMealPreference', label: 'Enable meal preference' },
              { key: 'enableSongRequest', label: 'Enable song requests' },
              { key: 'enableGuestbook', label: 'Enable guestbook' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded"
                  checked={!!(form[key])}
                  onChange={e => set(key, e.target.checked)}
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {msg && (
          <p className={`text-sm ${msg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
            {msg.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-gray-900 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
