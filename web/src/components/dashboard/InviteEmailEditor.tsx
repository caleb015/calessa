'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminApi';
import ColorInput from './ColorInput';

type Template = Record<string, string>;

interface InviteEmailResponse {
  template: Template;
  defaults: Template;
  placeholders: string[];
}

const TEXT_FIELDS: { key: string; label: string; multiline?: boolean }[] = [
  { key: 'inviteSubject', label: 'Subject line' },
  { key: 'inviteHeading', label: 'Heading' },
  { key: 'inviteTagline', label: 'Tagline' },
  { key: 'inviteGreeting', label: 'Greeting' },
  { key: 'inviteMessage', label: 'Message', multiline: true },
  { key: 'inviteButtonText', label: 'Button text' },
  { key: 'inviteSignoff', label: 'Sign-off' },
];

const COLOR_FIELDS: { key: string; label: string; tooltip?: string }[] = [
  { key: 'inviteBackgroundColor', label: 'Background' },
  { key: 'inviteTextColor', label: 'Text' },
  { key: 'inviteAccentColor', label: 'Accent', tooltip: 'Heading, button, and link color' },
  { key: 'inviteMutedColor', label: 'Muted text', tooltip: 'Tagline, footer, and divider color' },
  { key: 'inviteButtonTextColor', label: 'Button text' },
];

const inputCls =
  'w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent';

export default function InviteEmailEditor() {
  const [saved, setSaved] = useState<Template | null>(null);
  const [form, setForm] = useState<Template>({});
  const [defaults, setDefaults] = useState<Template>({});
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    adminApi.getInviteEmail()
      .then(data => {
        const res = data as InviteEmailResponse;
        setSaved(res.template);
        setForm(res.template);
        setDefaults(res.defaults);
        setPlaceholders(res.placeholders);
      })
      .catch(err => setMsg({ type: 'error', text: (err as Error).message }));
  }, []);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => {
      adminApi.previewInviteEmail(form)
        .then(data => { setPreview(data as { subject: string; html: string }); setPreviewError(''); })
        .catch(err => setPreviewError((err as Error).message));
    }, 400);
    return () => clearTimeout(timer);
  }, [form, saved]);

  const set = (key: string, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    setMsg(null);
  };

  const dirty = saved !== null && Object.keys(form).some(k => form[k] !== saved[k]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminApi.updateInviteEmail(form) as InviteEmailResponse;
      setSaved(res.template);
      setForm(res.template);
      setMsg({ type: 'success', text: 'Invitation email saved.' });
    } catch (err) {
      setMsg({ type: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(f => Object.fromEntries(Object.keys(f).map(k => [k, ''])));
    setMsg(null);
  };

  if (!saved) {
    return <div className="text-gray-400 text-sm">{msg?.text ?? 'Loading...'}</div>;
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <div className="space-y-6">
        <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Content</h2>
            <p className="text-xs text-gray-500 mt-1">
              Leave a field blank to use its default. You can use{' '}
              {placeholders.map((p, i) => (
                <span key={p}>
                  <code className="bg-gray-100 px-1 rounded">{p}</code>
                  {i < placeholders.length - 1 ? ', ' : ''}
                </span>
              ))}{' '}
              anywhere. A blank line in the message starts a new paragraph.
            </p>
          </div>
          {TEXT_FIELDS.map(({ key, label, multiline }) => (
            <div key={key}>
              <label htmlFor={key} className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              {multiline ? (
                <textarea
                  id={key}
                  rows={6}
                  className={`${inputCls} resize-y`}
                  placeholder={defaults[key]}
                  value={form[key] ?? ''}
                  onChange={e => set(key, e.target.value)}
                />
              ) : (
                <input
                  id={key}
                  type="text"
                  className={inputCls}
                  placeholder={defaults[key]}
                  value={form[key] ?? ''}
                  onChange={e => set(key, e.target.value)}
                />
              )}
            </div>
          ))}
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Colors</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {COLOR_FIELDS.map(({ key, label, tooltip }) => (
              <ColorInput
                key={key}
                label={label}
                tooltip={tooltip}
                value={form[key] ?? ''}
                defaultValue={defaults[key]}
                onChange={v => set(key, v)}
              />
            ))}
          </div>
        </section>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="bg-gray-900 text-white px-5 py-2 rounded-md text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save Email'}
          </button>
          <button
            onClick={handleReset}
            className="border border-gray-200 px-4 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50"
          >
            Reset to defaults
          </button>
          {dirty && !msg && <span className="text-xs text-amber-600">Unsaved changes</span>}
          {msg && (
            <span className={`text-sm ${msg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</span>
          )}
        </div>
      </div>

      <div className="lg:sticky lg:top-6 bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500">Preview · sample guest &ldquo;Juan dela Cruz&rdquo;</p>
          <p className="text-sm text-gray-900 mt-1 truncate">
            <span className="text-gray-500">Subject: </span>{preview?.subject ?? '…'}
          </p>
        </div>
        {previewError ? (
          <p className="p-4 text-sm text-red-500">{previewError}</p>
        ) : (
          <iframe
            title="Invitation email preview"
            sandbox=""
            srcDoc={preview?.html ?? ''}
            className="w-full h-[640px] bg-white"
          />
        )}
      </div>
    </div>
  );
}
