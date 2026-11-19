'use client';

import { useEffect, useRef, useState } from 'react';
import { RxArrowDown, RxArrowUp, RxCross2 } from 'react-icons/rx';
import { adminApi } from '@/lib/adminApi';
import FloatingSaveButton from '@/components/dashboard/FloatingSaveButton';
import ImageListField from '@/components/dashboard/ImageListField';

interface DressCodeForm {
  enabled: boolean;
  eyebrow: string;
  title: string;
  intro: string;
  palette: string[];
  imageUrls: string[];
}

const withDefaults = (data: unknown): DressCodeForm => {
  const d = data as Partial<DressCodeForm>;
  return { ...(d as DressCodeForm), imageUrls: d.imageUrls ?? [] };
};

const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const inputCls =
  'w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

export default function DressCodeSettingsEditor() {
  const [saved, setSaved] = useState<DressCodeForm | null>(null);
  const [form, setForm] = useState<DressCodeForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const saveButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    adminApi.getDressCode()
      .then(data => { setSaved(withDefaults(data)); setForm(withDefaults(data)); })
      .catch(err => setMsg({ type: 'error', text: (err as Error).message }));
  }, []);

  if (!form || !saved) return <p className="text-sm text-gray-400">{msg?.text ?? 'Loading…'}</p>;

  const update = (patch: Partial<DressCodeForm>) => {
    setForm(f => (f ? { ...f, ...patch } : f));
    setMsg(null);
  };
  const setColor = (i: number, value: string) => update({ palette: form.palette.map((c, j) => (j === i ? value : c)) });
  const move = (i: number, dir: -1 | 1) => {
    const next = [...form.palette];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    update({ palette: next });
  };
  const invalid = form.palette.filter(c => !HEX_COLOR.test(c));
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = withDefaults(await adminApi.updateDressCode(form));
      setSaved(res);
      setForm(res);
      setMsg({ type: 'success', text: 'Dress code saved.' });
    } catch (err) {
      setMsg({ type: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-gray-700">Dress Code Settings</h2>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.enabled} onChange={e => update({ enabled: e.target.checked })} />
          Show on the Details page
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="dc-eyebrow" className={labelCls}>Eyebrow</label>
          <input id="dc-eyebrow" className={inputCls} placeholder="e.g. Come in color!" value={form.eyebrow} onChange={e => update({ eyebrow: e.target.value })} />
        </div>
        <div>
          <label htmlFor="dc-title" className={labelCls}>Title</label>
          <input id="dc-title" className={inputCls} placeholder="e.g. The Dress Code" value={form.title} onChange={e => update({ title: e.target.value })} />
        </div>
      </div>
      <div>
        <label htmlFor="dc-intro" className={labelCls}>Intro</label>
        <textarea id="dc-intro" rows={3} className={`${inputCls} resize-y`} value={form.intro} onChange={e => update({ intro: e.target.value })} />
      </div>

      <div>
        <p className={labelCls}>Photos (optional)</p>
        <p className="text-xs text-gray-400 mb-2">Shown under the intro, e.g. outfit inspiration for everyone.</p>
        <ImageListField value={form.imageUrls} onChange={imageUrls => update({ imageUrls })} onBusyChange={setUploading} />
      </div>

      <div>
        <p className={labelCls}>Color palette</p>
        <div className="space-y-2">
          {form.palette.map((color, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                aria-label={`Color ${i + 1} picker`}
                value={HEX_COLOR.test(color) && color.length === 7 ? color : '#000000'}
                onChange={e => setColor(i, e.target.value)}
                className="w-9 h-9 rounded border border-gray-200 cursor-pointer p-0.5 shrink-0"
              />
              <input
                aria-label={`Color ${i + 1}`}
                className={`${inputCls} max-w-[10rem] ${HEX_COLOR.test(color) ? '' : 'border-red-400'}`}
                value={color}
                onChange={e => setColor(i, e.target.value)}
              />
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="p-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30"><RxArrowUp /></button>
              <button type="button" aria-label="Move down" disabled={i === form.palette.length - 1} onClick={() => move(i, 1)} className="p-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30"><RxArrowDown /></button>
              <button type="button" aria-label="Remove color" onClick={() => update({ palette: form.palette.filter((_, j) => j !== i) })} className="p-1.5 text-gray-500 hover:text-red-600"><RxCross2 /></button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => update({ palette: [...form.palette, '#c84b7a'] })}
          disabled={form.palette.length >= 24}
          className="mt-2 text-sm text-gray-900 underline disabled:opacity-40"
        >
          + Add color
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          ref={saveButton}
          onClick={handleSave}
          disabled={saving || uploading || !dirty || invalid.length > 0}
          className="bg-gray-900 text-white px-5 py-2 rounded-md text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : uploading ? 'Waiting for upload…' : 'Save settings'}
        </button>
        {invalid.length > 0 && <span className="text-xs text-red-500">Colors must be hex values like #c84b7a.</span>}
        {dirty && !msg && invalid.length === 0 && <span className="text-xs text-amber-600">Unsaved changes</span>}
        {msg && <span className={`text-sm ${msg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</span>}
      </div>
      <p className="text-xs text-gray-400">Guidelines below are saved individually.</p>
      <FloatingSaveButton
        saveButton={saveButton}
        dirty={dirty}
        onSave={handleSave}
        disabled={saving || uploading || invalid.length > 0}
        label={saving ? 'Saving…' : uploading ? 'Waiting for upload…' : 'Save changes'}
      />
    </section>
  );
}
