'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminApi';

interface GallerySettingsForm {
  uploadsEnabled: boolean;
  requireApproval: boolean;
  heading: string;
  subtext: string;
  buttonLabel: string;
}
type Saved = GallerySettingsForm & { defaults: Pick<GallerySettingsForm, 'heading' | 'subtext' | 'buttonLabel'> };

const inputCls =
  'w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

const formOf = ({ uploadsEnabled, requireApproval, heading, subtext, buttonLabel }: Saved): GallerySettingsForm =>
  ({ uploadsEnabled, requireApproval, heading, subtext, buttonLabel });

/** Settings for guest photo sharing, shown above the Gallery list. */
export default function GallerySettingsEditor() {
  const [saved, setSaved] = useState<Saved | null>(null);
  const [form, setForm] = useState<GallerySettingsForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    adminApi.getGallerySettings()
      .then(data => { setSaved(data as Saved); setForm(formOf(data as Saved)); })
      .catch(err => setMsg({ type: 'error', text: (err as Error).message }));
  }, []);

  if (!form || !saved) return <p className="text-sm text-gray-400 mb-6">{msg?.text ?? 'Loading…'}</p>;

  const update = (patch: Partial<GallerySettingsForm>) => {
    setForm(f => (f ? { ...f, ...patch } : f));
    setMsg(null);
  };
  const dirty = JSON.stringify(form) !== JSON.stringify(formOf(saved));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminApi.updateGallerySettings(form) as Saved;
      setSaved(res);
      setForm(formOf(res));
      setMsg({ type: 'success', text: 'Settings saved.' });
    } catch (err) {
      setMsg({ type: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-700">Guest Photo Sharing</h2>
        <a href="/gallery/upload" target="_blank" rel="noreferrer" className="text-xs text-gray-500 underline hover:text-gray-900">
          Open the upload page ↗
        </a>
      </div>

      <div className="space-y-2 text-sm text-gray-700">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.uploadsEnabled} onChange={e => update({ uploadsEnabled: e.target.checked })} />
          Let invited guests upload photos (they sign in with their RSVP invitation code)
        </label>
        <label className={`flex items-center gap-2 cursor-pointer ${form.uploadsEnabled ? '' : 'opacity-50'}`}>
          <input type="checkbox" checked={form.requireApproval} onChange={e => update({ requireApproval: e.target.checked })} />
          Approve guest photos before they appear in the gallery
        </label>
        <p className="text-xs text-gray-400 pl-6">
          {form.requireApproval
            ? 'New guest photos wait below as "Pending approval" until you click Publish.'
            : 'New guest photos appear in the gallery straight away. You can still unpublish or delete them below.'}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="gs-heading" className={labelCls}>Heading</label>
          <input id="gs-heading" className={inputCls} placeholder={saved.defaults.heading} value={form.heading} onChange={e => update({ heading: e.target.value })} />
        </div>
        <div>
          <label htmlFor="gs-button" className={labelCls}>Button label</label>
          <input id="gs-button" className={inputCls} placeholder={saved.defaults.buttonLabel} value={form.buttonLabel} onChange={e => update({ buttonLabel: e.target.value })} />
        </div>
      </div>
      <div>
        <label htmlFor="gs-subtext" className={labelCls}>Text under the heading</label>
        <textarea id="gs-subtext" rows={2} className={`${inputCls} resize-y`} placeholder={saved.defaults.subtext} value={form.subtext} onChange={e => update({ subtext: e.target.value })} />
        <p className="text-xs text-gray-400 mt-1">Leave a field blank to use the wording shown in grey.</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="bg-gray-900 text-white px-5 py-2 rounded-md text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {dirty && !msg && <span className="text-xs text-amber-600">Unsaved changes</span>}
        {msg && <span className={`text-sm ${msg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</span>}
      </div>
    </section>
  );
}
