'use client';

import { useRef, useState } from 'react';
import { RxUpload } from 'react-icons/rx';
import { uploadImage } from '@/lib/upload';

/** "Upload image" button that uploads to Cloudinary and hands back the image URL. */
export default function ImageUploadButton({ onUploaded }: { onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      onUploaded(await uploadImage(file));
    } catch (err) {
      setError((err as Error).message || 'Upload failed.');
    } finally {
      setUploading(false);
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
        aria-label="Choose image file"
        onChange={e => handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 text-xs border border-gray-200 rounded px-2.5 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
      >
        <RxUpload size={12} />
        {uploading ? 'Uploading…' : 'Upload image'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
