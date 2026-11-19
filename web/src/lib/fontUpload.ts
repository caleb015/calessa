import { adminApi } from '@/lib/adminApi';
import type { UploadSignature } from '@/types/api';

/** Font files are small; anything bigger is almost certainly the wrong file. */
export const MAX_FONT_MB = 5;
export const FONT_EXTENSIONS = ['woff2', 'woff', 'ttf', 'otf'];

/** Why a file can't be used as a font, or null if it's fine. */
export function fontFileProblem(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!FONT_EXTENSIONS.includes(ext)) return 'Please choose a font file (.woff2, .woff, .ttf or .otf).';
  if (file.size > MAX_FONT_MB * 1024 * 1024) return `Font file is too large (max ${MAX_FONT_MB} MB).`;
  return null;
}

/** A readable name from the file name, e.g. "Slopes-Regular.ttf" → "Slopes Regular". */
export function fontNameFromFile(fileName: string): string {
  const name = fileName.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9 -]+/g, ' ').replace(/[\s_-]+/g, ' ').trim().slice(0, 60);
  return /^[A-Za-z0-9]/.test(name) ? name : 'Uploaded font';
}

/**
 * Uploads a font file straight to Cloudinary (as a "raw" file in the fonts folder), signed by our API.
 * Returns the file's web link.
 */
export async function uploadFont(file: File): Promise<string> {
  const problem = fontFileProblem(file);
  if (problem) throw new Error(problem);
  const sig = await adminApi.getFontUploadSignature() as UploadSignature;
  const body = new FormData();
  body.append('file', file);
  body.append('api_key', sig.apiKey);
  body.append('timestamp', String(sig.timestamp));
  body.append('signature', sig.signature);
  body.append('folder', sig.folder);
  body.append('allowed_formats', sig.allowed_formats);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/raw/upload`, { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.secure_url) {
    throw new Error(data?.error?.message ? `Upload failed: ${data.error.message}` : 'Upload failed. Please try again.');
  }
  return data.secure_url as string;
}
