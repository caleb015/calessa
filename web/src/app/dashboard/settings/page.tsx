'use client';

import { useEffect, useRef, useState } from 'react';
import { adminApi } from '@/lib/adminApi';
import ImagePreview from '@/components/dashboard/ImagePreview';
import ImageUploadButton from '@/components/dashboard/ImageUploadButton';
import InfoTooltip from '@/components/dashboard/InfoTooltip';
import ColorInput from '@/components/dashboard/ColorInput';
import FloatingSaveButton from '@/components/dashboard/FloatingSaveButton';
import FontSettings from '@/components/dashboard/FontSettings';
import { toLocalDateTimeInput, fromLocalDateTimeInput } from '@/lib/datetime';
import { HERO_TEXT_ALIGNS, HERO_TEXT_OFFSET } from '@/lib/heroText';

const THEME_COLORS: { key: string; label: string; tooltip?: string; defaultValue: string }[] = [
  { key: 'themeBackground', label: 'Background', defaultValue: '#faf7f2' },
  { key: 'themeForeground', label: 'Foreground (text)', defaultValue: '#1e2b1a' },
  { key: 'themeMuted', label: 'Muted text', defaultValue: '#7a8e82' },
  { key: 'themeAccent', label: 'Accent', defaultValue: '#c84b7a' },
  { key: 'themeBorder', label: 'Border', defaultValue: '#e2d8d0' },
  {
    key: 'themeSurface',
    label: 'Surface',
    tooltip: 'A secondary background used for alternating sections and cards (e.g. the "Event Highlights" section on the homepage), distinct from the main page Background.',
    defaultValue: '#f2ede8',
  },
  {
    key: 'themeInverseBackground',
    label: 'Dark Section Background',
    tooltip: 'Background for deliberately dark sections, like the homepage\'s "Will you join us?" RSVP banner.',
    defaultValue: '#1a2618',
  },
  {
    key: 'themeOverlayText',
    label: 'Hero Photo Text',
    tooltip: 'Text and border color for content overlaid directly on the hero photo. If you change the hero photo, adjust this (and Hero Photo Backdrop below) so the text stays readable.',
    defaultValue: '#ffffff',
  },
  {
    key: 'themeOverlayScrim',
    label: 'Hero Photo Backdrop',
    tooltip: 'The gradient shading behind the hero photo text, used to keep it legible against the photo. Pick a color that contrasts with Hero Photo Text above (e.g. black backdrop with white text, or white backdrop with dark text).',
    defaultValue: '#000000',
  },
];

/** The page's sections, in order (also used for the jump links at the top). */
const SECTIONS = [
  { id: 'visibility', title: 'Site visibility' },
  { id: 'couple', title: 'The couple & dates' },
  { id: 'homepage', title: 'Homepage' },
  { id: 'rsvp', title: 'RSVP page' },
  { id: 'look', title: 'Look & feel' },
  { id: 'fonts', title: 'Fonts' },
  { id: 'sharing', title: 'Browser tab & sharing' },
  { id: 'other', title: 'Other features' },
] as const;
type SectionId = (typeof SECTIONS)[number]['id'];

function Section({ id, description, children }: { id: SectionId; description?: string; children: React.ReactNode }) {
  const title = SECTIONS.find(s => s.id === id)!.title;
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="bg-white rounded-lg border border-gray-200 p-5 scroll-mt-6">
      <h2 id={`${id}-title`} className="text-sm font-semibold text-gray-800">{title}</h2>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/** Settings without bookkeeping fields, for comparing and saving. */
const editable = ({ id, createdAt, updatedAt, ...rest }: Record<string, unknown>) => rest; // eslint-disable-line @typescript-eslint/no-unused-vars

export default function SettingsPage() {
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saved, setSaved] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const saveButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    adminApi.getSettings()
      .then(data => { setForm(data as Record<string, unknown>); setSaved(data as Record<string, unknown>); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const set = (key: string, value: unknown) => { setForm(prev => ({ ...prev, [key]: value })); setMsg(null); };
  const dirty = JSON.stringify(editable(form)) !== JSON.stringify(editable(saved));

  // Photo fields with an upload still running; saving waits until they finish.
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  const setUploadBusy = (key: string, busy: boolean) =>
    setUploading(prev => {
      if (prev.has(key) === busy) return prev;
      const next = new Set(prev);
      if (busy) next.add(key);
      else next.delete(key);
      return next;
    });

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const sent = form;
      const res = await adminApi.updateSettings(editable(sent)) as Record<string, unknown> | undefined;
      // What's now saved; anything typed while saving stays as an unsaved change.
      const now = res && typeof res === 'object' ? { ...sent, ...res } : sent;
      setSaved(now);
      setForm(current => (current === sent ? now : current));
      setMsg({ type: 'success', text: 'Settings saved.' });
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save.' });
    } finally {
      setSaving(false);
    }
  };
  const handleSave = (e: React.FormEvent) => { e.preventDefault(); save(); };

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading...</div>;

  const inputClass = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent';
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1';
  const busyLabel = saving ? 'Saving…' : uploading.size > 0 ? 'Waiting for upload…' : null;

  const text = (key: string, label: React.ReactNode, opts: { placeholder?: string; tooltip?: string; id?: string } = {}) => (
    <div>
      <label htmlFor={opts.id ?? key} className={labelClass}>
        {label}
        {opts.tooltip && <InfoTooltip text={opts.tooltip} />}
      </label>
      <input id={opts.id ?? key} className={inputClass} placeholder={opts.placeholder} value={(form[key] as string) ?? ''} onChange={e => set(key, e.target.value)} />
    </div>
  );
  const photo = (key: string, label: string, tooltip?: string) => (
    <div data-field={key}>
      <label htmlFor={key} className={labelClass}>
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </label>
      <input id={key} className={inputClass} placeholder="Upload an image or paste a link" value={(form[key] as string) ?? ''} onChange={e => set(key, e.target.value)} />
      <ImageUploadButton onUploaded={url => set(key, url)} onBusyChange={busy => setUploadBusy(key, busy)} />
      <ImagePreview src={(form[key] as string) ?? ''} />
    </div>
  );
  const toggle = (key: string, label: string, hint?: string) => (
    <label key={key} className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" className="w-4 h-4 rounded mt-0.5" checked={!!form[key]} onChange={e => set(key, e.target.checked)} />
      <span className="text-sm text-gray-700">
        {label}
        {hint && <span className="block text-xs text-gray-400">{hint}</span>}
      </span>
    </label>
  );
  const percent = (key: string, label: string, tooltip: string, placeholder: string, min: number, max: number) => (
    <div>
      <label htmlFor={key} className={labelClass}>
        {label}
        <InfoTooltip text={tooltip} />
      </label>
      <input id={key} type="number" min={min} max={max} className={inputClass} placeholder={placeholder}
        value={(form[key] as number) ?? ''}
        onChange={e => set(key, e.target.value === '' ? null : parseInt(e.target.value, 10))}
      />
    </div>
  );

  const heroTextOffset = (key: string, label: string, placeholder: string, tooltip: string) => {
    const value = (form[key] as string | null | undefined) ?? '';
    return (
      <div>
        <label htmlFor={key} className={labelClass}>
          {label}
          <InfoTooltip text={tooltip} />
        </label>
        <input id={key} className={inputClass} placeholder={placeholder} value={value} onChange={e => set(key, e.target.value.trim())} />
        {value !== '' && !HERO_TEXT_OFFSET.test(value) && (
          <p role="alert" className="mt-1 text-xs text-red-600">Use pixels or a percentage, e.g. 120px, 10% or -40px.</p>
        )}
      </div>
    );
  };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Wedding Settings</h1>

      <nav aria-label="Settings sections" className="flex flex-wrap gap-1.5 mb-6">
        {SECTIONS.map(s => (
          <a key={s.id} href={`#${s.id}`} className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100">
            {s.title}
          </a>
        ))}
      </nav>

      <form onSubmit={handleSave} className="space-y-6">

        <Section id="visibility" description="While the site is private, visitors see an Under Maintenance page with a countdown. You can still look around with Preview.">
          {toggle('isPublic', 'Site is public')}
        </Section>

        <Section id="couple">
          <div className="grid grid-cols-2 gap-4">
            {text('coupleNameA', 'Name A')}
            {text('coupleNameB', 'Name B')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="weddingDate" className={labelClass}>Wedding Date</label>
              <input id="weddingDate" type="datetime-local" className={inputClass}
                value={form.weddingDate ? toLocalDateTimeInput(form.weddingDate as string) : ''}
                onChange={e => set('weddingDate', fromLocalDateTimeInput(e.target.value))}
              />
            </div>
            <div>
              <label htmlFor="rsvpDeadline" className={labelClass}>RSVP Deadline</label>
              <input id="rsvpDeadline" type="datetime-local" className={inputClass}
                value={form.rsvpDeadline ? toLocalDateTimeInput(form.rsvpDeadline as string) : ''}
                onChange={e => set('rsvpDeadline', fromLocalDateTimeInput(e.target.value))}
              />
            </div>
          </div>
        </Section>

        <Section id="homepage" description="The big photo at the top, the welcome message, and the photos further down the page.">
          {photo('heroImageUrl', 'Hero Image URL')}
          {photo('heroMobileImageUrl', 'Phone Hero Image (optional)', 'A separate photo for phones, whose tall screens crop a landscape photo hard: a portrait photo works best. Phones download only this one. Leave empty to use the Hero Image on phones too. Hero Horizontal/Vertical Offset then apply to computers only; phones use Phone Hero Vertical Offset.')}
          {percent('heroMobileImageOffsetY', 'Phone Hero Vertical Offset', 'Moves the hero photo up or down on phones, by this percentage of the hero’s height. 0 = no shift (default). Positive moves it up, negative moves it down. The photo zooms in a little as it moves, so no gap appears. Once set (or once there is a phone photo), the Hero Horizontal/Vertical Offset apply to computers only.', '0', -50, 50)}
          <div className="grid grid-cols-2 gap-4">
            {percent('heroImageOffsetX', 'Hero Horizontal Offset', 'Shifts the photo by this percentage of its own width. 0 = no shift (default). Positive moves the image right, negative moves it left.', '0', -50, 50)}
            {percent('heroImageOffsetY', 'Hero Vertical Offset', 'Shifts the photo by this percentage of its own height. 0 = no shift (default). Positive moves the image up, negative moves it down.', '0', -50, 50)}
          </div>
          {percent('heroImageHeight', 'Hero Image Height', 'Height of the hero section as a percentage of the screen height. 100 = full screen (default).', '100', 20, 200)}
          <div>
            <label htmlFor="heroTextAlign" className={labelClass}>
              Hero Text Alignment
              <InfoTooltip text="How the date, your names and the RSVP button line up with each other, within the width of the text (the text itself stays where the offsets put it). Justify runs each line edge to edge where it can (the date spreads out and the button widens); single words start at the left." />
            </label>
            <select id="heroTextAlign" className={inputClass} value={(form.heroTextAlign as string) || 'center'}
              onChange={e => set('heroTextAlign', e.target.value === 'center' ? '' : e.target.value)}>
              {HERO_TEXT_ALIGNS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {heroTextOffset('heroTextOffset', 'Hero Text Horizontal Offset', 'e.g. -120px or -10%',
              'Moves the hero text sideways from the centre of the photo, in pixels (120px) or a percentage of the screen width (10%). Negative moves it left, positive moves it right. Applies on tablets and computers; on phones the names already fill the width.')}
            {heroTextOffset('heroTextOffsetY', 'Hero Text Vertical Offset', 'e.g. 80px or 15%',
              'Moves the hero text up or down from the middle of the photo, in pixels (80px) or a percentage of the photo’s height (15%). Positive moves it up, negative moves it down, like the photo’s own offset. Applies on phones too, unless Phone Hero Text Vertical Offset is set.')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {heroTextOffset('heroMobileTextOffsetY', 'Phone Hero Text Vertical Offset', 'e.g. -60px or -10%',
              'Moves the hero text up or down on phones only, in pixels or a percentage of the photo’s height. Positive moves it up, negative moves it down. Leave empty for phones to follow Hero Text Vertical Offset; computers always use that one.')}
          </div>
          <div>
            <label htmlFor="welcomeMessage" className={labelClass}>Welcome Message</label>
            <textarea id="welcomeMessage" className={`${inputClass} resize-none`} rows={3} value={(form.welcomeMessage as string) ?? ''} onChange={e => set('welcomeMessage', e.target.value)} />
          </div>
          {photo('welcomeImageUrl', 'Welcome Photo (optional)', 'Shown beside the welcome message on the homepage. Leave empty to show the message on its own.')}
          {photo('rsvpBannerImageUrl', 'RSVP Banner Photo (optional)', 'Shown behind “Will you join us?” near the bottom of the homepage. Leave empty for a plain colour.')}
          {toggle('homepageGalleryShuffle', 'Show homepage Moments photos in random order (a fresh order on each visit)', 'Choose which photos appear in Content → Gallery, with “On homepage”.')}
        </Section>

        <Section id="rsvp" description="The page guests use to reply, and what they can answer.">
          {text('rsvpHeading', 'RSVP Page Heading', { placeholder: "You're Invited", tooltip: "The small heading above “RSVP” on the RSVP page. Leave empty to show “You're Invited”." })}
          {text('rsvpTagline', 'RSVP Page Tagline', { placeholder: "We can't wait to celebrate with you.", tooltip: 'The small line under your names at the top of the RSVP page.' })}
          {text('rsvpSubtext', 'RSVP Page Subtext', { placeholder: 'My Hoomans are tying the knot!!', tooltip: 'The handwritten line in the invitation code box, below Odie.' })}
          <div className="space-y-3 pt-1">
            {toggle('isRsvpEnabled', 'RSVPs open')}
            {toggle('allowMaybe', 'Allow "Maybe" response')}
            {toggle('enableMealPreference', 'Enable meal preference')}
            {toggle('enableSongRequest', 'Enable song requests')}
          </div>
        </Section>

        <Section id="look" description="The monogram and colours used across the public site. Leave a colour blank to use the default shown.">
          {photo('monogramUrl', 'Monogram URL', 'Shown in the site’s top navigation and as the browser tab icon.')}
          <div className="grid grid-cols-2 gap-4">
            {THEME_COLORS.map(({ key, label, tooltip, defaultValue }) => (
              <ColorInput
                key={key}
                label={label}
                tooltip={tooltip}
                value={(form[key] as string) ?? ''}
                defaultValue={defaultValue}
                onChange={v => set(key, v)}
              />
            ))}
          </div>
        </Section>

        <Section id="fonts" description="The fonts used across the public site. Keep a default, pick a Google font, or upload your own font file.">
          <FontSettings form={form} set={set} onUploadBusy={setUploadBusy} />
        </Section>

        <Section id="sharing" description="How the site appears in a browser tab, in search results, and when its link is shared.">
          {text('siteTitle', 'Browser Tab Title', { tooltip: 'Shown in the browser tab and as the title when this page is shared as a link preview.' })}
          {text('siteDescription', 'Browser Tab Description', { tooltip: 'Shown beneath the title in search results and link previews when this page is shared — not displayed anywhere on the site itself.' })}
        </Section>

        <Section id="other">
          {toggle('enableGuestbook', 'Enable guestbook')}
        </Section>

        {msg && (
          <p className={`text-sm ${msg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
            {msg.text}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            ref={saveButton}
            type="submit"
            disabled={saving || uploading.size > 0}
            className="bg-gray-900 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {busyLabel ?? 'Save Settings'}
          </button>
          {dirty && !msg && <span className="text-xs text-amber-600">Unsaved changes</span>}
        </div>
      </form>

      <FloatingSaveButton
        saveButton={saveButton}
        dirty={dirty}
        onSave={save}
        disabled={saving || uploading.size > 0}
        label={busyLabel ?? 'Save changes'}
      />
    </div>
  );
}
