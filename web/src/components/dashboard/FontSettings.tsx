'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { RxUpload } from 'react-icons/rx';
import { FONT_ROLES, FONT_NAME, fontChoice, googleFontUrl, type FontRole, type FontSettings as FontValues } from '@/lib/fonts';
import { fontNameFromFile, uploadFont } from '@/lib/fontUpload';

type Mode = 'default' | 'google' | 'upload';

/** How long typing must pause before a Google font is loaded for the preview. */
const PREVIEW_DELAY_MS = 500;

const inputCls = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent';

/**
 * The site's fonts, one card per role. Each can keep its default, use a Google font (any family name;
 * suggestions included), or use an uploaded font file (stored on Cloudinary with the photos).
 */
export default function FontSettings({
  form,
  set,
  onUploadBusy,
}: {
  form: FontValues;
  set: (key: string, value: unknown) => void;
  /** Reports while a font file uploads, so saving can wait. */
  onUploadBusy?: (key: string, busy: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      {FONT_ROLES.map(role => <FontRoleField key={role.key} role={role} form={form} set={set} onUploadBusy={onUploadBusy} />)}
    </div>
  );
}

function FontRoleField({ role, form, set, onUploadBusy }: {
  role: FontRole;
  form: FontValues;
  set: (key: string, value: unknown) => void;
  onUploadBusy?: (key: string, busy: boolean) => void;
}) {
  const choice = fontChoice(form, role);
  const [mode, setMode] = useState<Mode>(choice.kind);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const ids = useId();
  const name = (form[role.nameField] as string | null | undefined) ?? '';
  const url = (form[role.urlField] as string | null | undefined) ?? '';

  const choose = (next: Mode) => {
    setMode(next);
    setError(null);
    if (next === 'default') { set(role.nameField, ''); set(role.urlField, ''); }
    if (next === 'google') { set(role.urlField, ''); if (choice.kind === 'upload') set(role.nameField, ''); }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    onUploadBusy?.(role.urlField, true);
    setError(null);
    try {
      const link = await uploadFont(file);
      set(role.urlField, link);
      set(role.nameField, fontNameFromFile(file.name));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      onUploadBusy?.(role.urlField, false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  // Load a Google font for the preview only once typing pauses (not for every partial name).
  const typedGoogleName = choice.kind === 'google' ? choice.name : null;
  const [previewName, setPreviewName] = useState(typedGoogleName);
  useEffect(() => {
    const id = window.setTimeout(() => setPreviewName(typedGoogleName), PREVIEW_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [typedGoogleName]);

  const nameInvalid = mode !== 'default' && name !== '' && !FONT_NAME.test(name.trim());
  const previewFamily =
    choice.kind === 'google' ? `"${choice.name}", ${role.fallback}`
      : choice.kind === 'upload' ? `"Preview ${role.label}", ${role.fallback}`
      : role.defaultPreview ?? `var(${role.cssVar}), ${role.fallback}`;

  return (
    <fieldset className="border border-gray-200 rounded-md p-4" aria-describedby={`${ids}-where`}>
      <legend className="px-1 text-sm font-medium text-gray-800">{role.label}</legend>
      <p id={`${ids}-where`} className="text-xs text-gray-500 -mt-1 mb-3">{role.usedFor}. Default: {role.defaultName}.</p>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-700 mb-3" role="radiogroup" aria-label={`${role.label} font`}>
        {([['default', `Default (${role.defaultName})`], ['google', 'Google font'], ['upload', 'Upload a font file']] as [Mode, string][]).map(([value, label]) => (
          <label key={value} className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name={`${ids}-mode`} checked={mode === value} onChange={() => choose(value)} />
            {label}
          </label>
        ))}
      </div>

      {mode === 'google' && (
        <div className="space-y-1">
          <label htmlFor={`${ids}-name`} className="block text-xs font-medium text-gray-600">Font name</label>
          <input
            id={`${ids}-name`}
            className={inputCls}
            list={`${ids}-suggestions`}
            placeholder={`e.g. ${role.suggestions[1]}`}
            value={name}
            onChange={e => set(role.nameField, e.target.value)}
          />
          <datalist id={`${ids}-suggestions`}>
            {role.suggestions.map(s => <option key={s} value={s} />)}
          </datalist>
          <p className="text-xs text-gray-400">
            Pick a suggestion, or type the name of any font from{' '}
            <a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">Google Fonts ↗</a>
            , exactly as it’s written there.
          </p>
        </div>
      )}

      {mode === 'upload' && (
        <div className="space-y-2">
          <input
            ref={fileInput}
            type="file"
            accept=".woff2,.woff,.ttf,.otf"
            className="hidden"
            aria-label={`Choose a ${role.label.toLowerCase()} font file`}
            onChange={e => onFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 text-xs border border-gray-200 rounded px-2.5 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RxUpload size={12} />
            {uploading ? 'Uploading…' : url ? 'Replace font file' : 'Upload font file'}
          </button>
          <p className="text-xs text-gray-400">.woff2 (best), .woff, .ttf or .otf, up to 5 MB.</p>
          {url && (
            <div>
              <label htmlFor={`${ids}-label`} className="block text-xs font-medium text-gray-600 mb-1">Name (for your reference)</label>
              <input id={`${ids}-label`} className={inputCls} value={name} onChange={e => set(role.nameField, e.target.value)} />
            </div>
          )}
        </div>
      )}

      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
      {nameInvalid && <p role="alert" className="mt-2 text-xs text-red-600">Font names can only use letters, numbers, spaces and hyphens.</p>}

      {/* Load the chosen font here too, so the preview shows it (a plain link: never holds up the page). */}
      {choice.kind === 'google' && previewName && <link data-font-preview rel="stylesheet" href={googleFontUrl(previewName)} />}
      {choice.kind === 'upload' && (
        <style>{`@font-face{font-family:"Preview ${role.label}";src:url("${choice.url}");font-display:swap;}`}</style>
      )}
      <p
        data-testid={`font-preview-${role.key}`}
        style={{ fontFamily: previewFamily }}
        className={`mt-3 rounded bg-gray-50 px-3 py-2 text-gray-800 ${role.key === 'body' ? 'text-sm' : 'text-2xl'}`}
      >
        {role.sample}
      </p>
    </fieldset>
  );
}
