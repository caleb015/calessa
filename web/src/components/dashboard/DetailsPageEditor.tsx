'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/adminApi';

interface DetailsPageForm {
  headerEyebrow: string;
  headerTitle: string;
  location: string;
  showAddToCalendar: boolean;
  ctaEnabled: boolean;
  ctaHeading: string;
  ctaSubtext: string;
  ctaButtonLabel: string;
}

interface DetailsPageResponse {
  page: DetailsPageForm;
  defaults: Record<string, string>;
}

const inputCls =
  'w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

export default function DetailsPageEditor() {
  const [saved, setSaved] = useState<DetailsPageForm | null>(null);
  const [form, setForm] = useState<DetailsPageForm | null>(null);
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    adminApi.getDetailsPage()
      .then(data => {
        const res = data as DetailsPageResponse;
        setSaved(res.page);
        setForm(res.page);
        setDefaults(res.defaults);
      })
      .catch(err => setMsg({ type: 'error', text: (err as Error).message }));
  }, []);

  if (!form || !saved) return <p className="text-sm text-gray-400">{msg?.text ?? 'Loading…'}</p>;

  const set = <K extends keyof DetailsPageForm>(key: K, value: DetailsPageForm[K]) => {
    setForm(f => (f ? { ...f, [key]: value } : f));
    setMsg(null);
  };
  const dirty = (Object.keys(form) as (keyof DetailsPageForm)[]).some(k => form[k] !== saved[k]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminApi.updateDetailsPage(form) as DetailsPageResponse;
      setSaved(res.page);
      setForm(res.page);
      setMsg({ type: 'success', text: 'Details page saved.' });
    } catch (err) {
      setMsg({ type: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const text = (key: 'headerEyebrow' | 'headerTitle' | 'location' | 'ctaHeading' | 'ctaSubtext' | 'ctaButtonLabel', label: string, placeholder?: string) => (
    <div>
      <label htmlFor={`dp-${key}`} className={labelCls}>{label}</label>
      <input
        id={`dp-${key}`}
        type="text"
        className={inputCls}
        placeholder={defaults[key] ?? placeholder}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Header and closing section of the Details page. Blank fields use the default shown in grey.{' '}
        <Link href="/details" target="_blank" className="text-gray-900 underline">View page →</Link>
      </p>

      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Header</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {text('headerEyebrow', 'Eyebrow')}
          {text('headerTitle', 'Title')}
        </div>
        {text('location', 'Location', 'e.g. Antipolo, Rizal')}
        <p className="text-xs text-gray-400">The date comes from Settings → Wedding Date.</p>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.showAddToCalendar} onChange={e => set('showAddToCalendar', e.target.checked)} />
          Show &ldquo;Add to Calendar&rdquo;
        </label>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Call to Action</h2>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.ctaEnabled} onChange={e => set('ctaEnabled', e.target.checked)} />
          Show the call to action (links to the Schedule page)
        </label>
        {text('ctaHeading', 'Heading')}
        {text('ctaSubtext', 'Subtext')}
        {text('ctaButtonLabel', 'Button label')}
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="bg-gray-900 text-white px-5 py-2 rounded-md text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {dirty && !msg && <span className="text-xs text-amber-600">Unsaved changes</span>}
        {msg && <span className={`text-sm ${msg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
