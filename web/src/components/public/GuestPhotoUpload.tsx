'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FiCheckCircle, FiImage, FiX } from 'react-icons/fi';
import { ApiError, publicApi, type UploadedImage } from '@/lib/api';
import { imageFileProblem, uploadToCloudinary } from '@/lib/upload';
import { forgetInvitationCode, getRememberedInvitationCode, rememberInvitationCode } from '@/lib/invitationCode';

export const MAX_FILES_PER_UPLOAD = 30;
const PARALLEL_UPLOADS = 3;

type Status = 'ready' | 'invalid' | 'uploading' | 'done' | 'failed';
interface Item {
  id: string;
  file: File;
  preview: string;
  status: Status;
  error?: string;
  result?: UploadedImage;
}

function codeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return "We couldn't find that invitation code. You'll find it in your invitation email.";
    if (err.status === 403) return 'Photo sharing is closed right now.';
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}

const btn = 'inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-semibold transition-opacity disabled:opacity-50';
const primaryBtn = `${btn} bg-[var(--accent)] text-white hover:opacity-90`;
const secondaryBtn = `${btn} border border-[var(--border)] hover:bg-[var(--foreground)]/5`;

/** Invited guests enter their RSVP code, pick several photos and upload them to the gallery. */
export default function GuestPhotoUpload() {
  const params = useSearchParams();
  const [code, setCode] = useState(params?.get('code') ?? '');
  const [guestName, setGuestName] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState<{ added: number; pendingApproval: boolean } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  // A link like /gallery/upload?code=ABC123 signs the guest in straight away;
  // otherwise the code they used before (RSVP or a previous upload) is filled in.
  useEffect(() => {
    const fromLink = params?.get('code');
    if (!fromLink) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCode(c => c || getRememberedInvitationCode());
      return;
    }
    publicApi.verifyGalleryCode(fromLink)
      .then(({ name }) => { rememberInvitationCode(fromLink); setGuestName(name); })
      .catch(err => setError(codeError(err)));
  }, [params]);

  // Free the photo previews when leaving the page.
  useEffect(() => () => itemsRef.current.forEach(i => URL.revokeObjectURL(i.preview)), []);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError(null);
    try {
      setGuestName((await publicApi.verifyGalleryCode(code.trim())).name);
      rememberInvitationCode(code);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) forgetInvitationCode(code);
      setError(codeError(err));
    } finally {
      setChecking(false);
    }
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    setFinished(null);
    setError(null);
    const room = MAX_FILES_PER_UPLOAD - items.filter(i => i.status !== 'done').length;
    const picked = Array.from(files);
    if (picked.length > room) setError(`You can share up to ${MAX_FILES_PER_UPLOAD} photos at a time.`);
    const added = picked.slice(0, Math.max(room, 0)).map((file): Item => {
      const problem = imageFileProblem(file);
      return {
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
        status: problem ? 'invalid' : 'ready',
        error: problem ?? undefined,
      };
    });
    setItems(prev => [...prev, ...added]);
    if (fileInput.current) fileInput.current.value = '';
  };

  const remove = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const patchItem = (id: string, patch: Partial<Item>) =>
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)));

  const upload = async () => {
    const queue = items.filter(i => i.status === 'ready' || i.status === 'failed');
    if (!queue.length) return;
    setBusy(true);
    setError(null);
    try {
      const sig = await publicApi.getGalleryUploadSignature(code.trim());
      const results: UploadedImage[] = [];
      // Upload a few at a time so a big batch doesn't overwhelm a phone connection.
      const work = [...queue];
      await Promise.all(Array.from({ length: Math.min(PARALLEL_UPLOADS, work.length) }, async () => {
        for (let item = work.shift(); item; item = work.shift()) {
          patchItem(item.id, { status: 'uploading', error: undefined });
          try {
            const r = await uploadToCloudinary(item.file, sig);
            const result = { publicId: r.public_id, version: r.version, signature: r.signature, format: r.format };
            results.push(result);
            patchItem(item.id, { status: 'done', result });
          } catch (err) {
            patchItem(item.id, { status: 'failed', error: (err as Error).message });
          }
        }
      }));

      // Previously uploaded photos whose save failed are retried too.
      const unsaved = itemsRef.current.filter(i => i.status === 'done' && i.result).map(i => i.result!);
      const toSave = [...new Map([...unsaved, ...results].map(r => [r.publicId, r])).values()];
      if (toSave.length) {
        const saved = await publicApi.addGalleryUploads(code.trim(), toSave);
        setFinished(saved);
        setItems(prev => prev.filter(i => i.status !== 'done'));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // ── Step 1: invitation code ──────────────────────────────────────────────
  if (!guestName) {
    return (
      <form onSubmit={verify} className="mx-auto max-w-sm text-center">
        <label htmlFor="invite-code" className="block text-sm text-[var(--muted)] mb-3">
          Enter the invitation code from your RSVP to start sharing.
        </label>
        <input
          id="invite-code"
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="e.g. 5ZQ8D6PU"
          autoComplete="off"
          className="w-full rounded-full border border-[var(--border)] bg-transparent px-5 py-3 text-center font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={checking || !code.trim()} className={`${primaryBtn} mt-5 w-full`}>
          {checking ? 'Checking…' : 'Continue'}
        </button>
      </form>
    );
  }

  const pending = items.filter(i => i.status === 'ready' || i.status === 'failed').length;
  const uploaded = items.filter(i => i.status === 'done').length;

  // ── Step 2: pick and upload photos ──────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-center text-lg mb-6">
        Hi <span className="font-serif text-2xl">{guestName}</span>! Pick as many photos as you like.
      </p>

      {finished && (
        <div role="status" className="mb-8 rounded-2xl border border-[var(--border)] px-6 py-6 text-center">
          <FiCheckCircle className="mx-auto mb-2 text-[var(--accent)]" size={28} aria-hidden />
          <p className="font-serif text-xl">Thank you for sharing!</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {finished.added === 0
              ? 'Those photos were already shared.'
              : finished.pendingApproval
                ? `${finished.added} ${finished.added === 1 ? 'photo' : 'photos'} will appear in the gallery once the couple has had a look.`
                : `${finished.added} ${finished.added === 1 ? 'photo is' : 'photos are'} now in the gallery.`}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/gallery" className={secondaryBtn}>View the gallery</Link>
          </div>
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        multiple
        accept="image/*,.heic,.heif"
        className="hidden"
        aria-label="Choose photos"
        onChange={e => addFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={busy}
        className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] px-6 py-10 text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
      >
        <FiImage size={28} aria-hidden />
        <span className="font-medium">{items.length ? 'Add more photos' : finished ? 'Share more photos' : 'Choose photos'}</span>
        <span className="text-xs">Up to {MAX_FILES_PER_UPLOAD} at a time · max 10 MB each</span>
      </button>

      {items.length > 0 && (
        <ul className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {items.map(item => (
            <li key={item.id} className="relative aspect-square overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--foreground)]/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.preview}
                alt={item.file.name}
                className={`h-full w-full object-cover ${item.status === 'uploading' ? 'opacity-50' : ''}`}
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                {item.status === 'uploading' ? 'Uploading…' : item.status === 'done' ? 'Uploaded ✓' : item.error ?? item.file.name}
              </span>
              {(item.status === 'invalid' || item.status === 'failed') && (
                <span className="absolute inset-0 ring-2 ring-inset ring-red-500 rounded-lg pointer-events-none" />
              )}
              {!busy && item.status !== 'done' && (
                <button
                  type="button"
                  aria-label={`Remove ${item.file.name}`}
                  onClick={() => remove(item.id)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                >
                  <FiX size={12} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p role="alert" className="mt-4 text-center text-sm text-red-600">{error}</p>}

      {items.length > 0 && (
        <div className="mt-6 text-center">
          <button type="button" onClick={upload} disabled={busy || pending === 0} className={`${primaryBtn} w-full max-w-sm`}>
            {busy
              ? `Uploading ${uploaded}/${items.length}…`
              : `Share ${pending} ${pending === 1 ? 'photo' : 'photos'}`}
          </button>
          {items.some(i => i.status === 'invalid') && (
            <p className="mt-2 text-xs text-[var(--muted)]">Photos marked in red can&apos;t be uploaded; remove them to continue.</p>
          )}
        </div>
      )}
    </div>
  );
}
