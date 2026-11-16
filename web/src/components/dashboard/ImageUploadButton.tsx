'use client';

import { useEffect, useRef, useState } from 'react';
import { RxUpload } from 'react-icons/rx';
import { uploadImage } from '@/lib/upload';

/** Failed files listed by name; the rest are counted. */
const MAX_ERRORS_SHOWN = 5;

/**
 * "Upload image" button that uploads to Cloudinary and hands back the image URL.
 * With `multiple`, several files can be chosen; each URL is handed back as it finishes, with the
 * file's position in the selection. `concurrency` uploads that many at once (for big batches).
 * `onBusyChange` reports while uploads are running, so forms can hold off saving until then.
 */
export default function ImageUploadButton({
  onUploaded,
  multiple = false,
  concurrency = 1,
  disabled = false,
  onBusyChange,
  label,
  className = 'mt-1.5',
}: {
  onUploaded: (url: string, index: number) => void | Promise<void>;
  multiple?: boolean;
  concurrency?: number;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  /** Button text (defaults to "Upload image" / "Upload images"). */
  label?: string;
  /** Classes for the wrapper (spacing). */
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Once the form is closed, late uploads are ignored (they'd otherwise land in the next form).
  const mounted = useRef(true);
  const busyCallback = useRef(onBusyChange);
  useEffect(() => { busyCallback.current = onBusyChange; }, [onBusyChange]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      busyCallback.current?.(false);
    };
  }, []);

  // Leaving the page would cancel the remaining uploads of a big batch; ask first.
  useEffect(() => {
    if (!uploading) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [uploading]);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    onBusyChange?.(true);
    setError(null);
    const failed: { index: number; message: string }[] = [];
    let done = 0;
    let nextIndex = 0;
    setProgress({ done, total: files.length });
    // Each worker takes the next file until none are left.
    const worker = async () => {
      while (nextIndex < files.length && mounted.current) {
        const index = nextIndex++;
        const file = files[index];
        try {
          const url = await uploadImage(file);
          if (!mounted.current) return;
          await onUploaded(url, index);
        } catch (err) {
          const reason = (err as Error).message || 'Upload failed.';
          failed.push({ index, message: files.length > 1 ? `${file.name}: ${reason}` : reason });
        }
        done++;
        if (mounted.current) setProgress({ done, total: files.length });
      }
    };
    try {
      await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, worker));
      if (failed.length && mounted.current) {
        const messages = failed.sort((a, b) => a.index - b.index).map(f => f.message);
        const shown = messages.slice(0, MAX_ERRORS_SHOWN).join(' ');
        setError(messages.length > MAX_ERRORS_SHOWN ? `${shown} …and ${messages.length - MAX_ERRORS_SHOWN} more couldn't be uploaded.` : shown);
      }
    } finally {
      if (mounted.current) {
        setUploading(false);
        setProgress(null);
        onBusyChange?.(false);
      }
      if (inputRef.current) inputRef.current.value = ''; // allow choosing the same file again
    }
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        aria-label={multiple ? 'Choose image files' : 'Choose image file'}
        multiple={multiple}
        onChange={e => handleFiles(Array.from(e.target.files ?? []))}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || disabled}
        className="inline-flex items-center gap-1.5 text-xs border border-gray-200 rounded px-2.5 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
      >
        <RxUpload size={12} />
        {uploading
          ? progress && progress.total > 1 ? `Uploading ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…` : 'Uploading…'
          : label ?? (multiple ? 'Upload images' : 'Upload image')}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
