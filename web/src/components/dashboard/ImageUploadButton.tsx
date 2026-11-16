'use client';

import { useEffect, useRef, useState } from 'react';
import { RxUpload } from 'react-icons/rx';
import { uploadImage } from '@/lib/upload';

/**
 * "Upload image" button that uploads to Cloudinary and hands back the image URL.
 * With `multiple`, several files can be chosen; each URL is handed back as it finishes.
 * `onBusyChange` reports while uploads are running, so forms can hold off saving until then.
 */
export default function ImageUploadButton({
  onUploaded,
  multiple = false,
  disabled = false,
  onBusyChange,
}: {
  onUploaded: (url: string) => void;
  multiple?: boolean;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
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

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    onBusyChange?.(true);
    setError(null);
    const failed: string[] = [];
    try {
      for (const [i, file] of files.entries()) {
        setProgress({ done: i, total: files.length });
        try {
          const url = await uploadImage(file);
          if (!mounted.current) return;
          onUploaded(url);
        } catch (err) {
          const reason = (err as Error).message || 'Upload failed.';
          failed.push(files.length > 1 ? `${file.name}: ${reason}` : reason);
        }
      }
      if (failed.length) setError(failed.join(' '));
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
    <div className="mt-1.5">
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
          ? progress && progress.total > 1 ? `Uploading ${progress.done + 1} of ${progress.total}…` : 'Uploading…'
          : multiple ? 'Upload images' : 'Upload image'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
