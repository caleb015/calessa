import { adminApi } from '@/lib/adminApi';
import type { UploadSignature } from '@/types/api';

export const MAX_UPLOAD_MB = 10; // Cloudinary free plan limit per image

/** What Cloudinary returns for a finished upload (the fields we use). */
export interface CloudinaryUpload {
  secure_url: string;
  public_id: string;
  version: number;
  signature: string;
  format: string;
}

/**
 * Cloudinary serves whatever it stores; these options make it send a compressed copy in the best
 * format for the browser (e.g. WebP), no wider than 2400px, instead of the full-size original.
 */
export function optimizedImageUrl(secureUrl: string): string {
  return secureUrl.replace('/image/upload/', '/image/upload/f_auto,q_auto,c_limit,w_2400/');
}

/** A small square version of a Cloudinary image for list thumbnails; other URLs are returned as-is. */
export function thumbnailUrl(url: string, size = 96): string {
  return url.includes('res.cloudinary.com') && url.includes('/image/upload/f_auto,q_auto,c_limit,w_2400/')
    ? url.replace('/f_auto,q_auto,c_limit,w_2400/', `/f_auto,q_auto,c_fill,w_${size},h_${size}/`)
    : url;
}

/**
 * A small, heavily blurred still of a Cloudinary image (first frame for GIFs), for soft
 * backgrounds; other URLs are returned as-is.
 */
export function backdropUrl(url: string): string {
  return url.includes('res.cloudinary.com') && url.includes('/image/upload/f_auto,q_auto,c_limit,w_2400/')
    ? url.replace('/f_auto,q_auto,c_limit,w_2400/', '/pg_1/f_auto,q_auto,w_400,e_blur:1200/')
    : url;
}

/** Frame used for a GIF's still: early frames are often blank or a fade-in. Shorter GIFs give their last frame. */
const GIF_STILL_FRAME = 10;

/**
 * A Cloudinary image cropped to exactly `width`×`height` around its most interesting part; other URLs
 * are returned as-is. A GIF becomes a light JPEG still: animations are heavy, and large ones can't be
 * resized on the free plan at all.
 */
export function croppedUrl(url: string, width: number, height: number): string {
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/f_auto,q_auto,c_limit,w_2400/')) return url;
  const crop = `c_fill,g_auto,w_${width},h_${height}`;
  const options = /\.gif$/i.test(url) ? `pg_${GIF_STILL_FRAME}/f_jpg,q_auto,${crop}` : `f_auto,q_auto,${crop}`;
  return url.replace('/f_auto,q_auto,c_limit,w_2400/', `/${options}/`);
}

/** A Cloudinary image scaled down to at most `width` pixels wide (never cropped); other URLs as-is. */
export function fitWidthUrl(url: string, width: number): string {
  return url.includes('res.cloudinary.com') && url.includes('/image/upload/f_auto,q_auto,c_limit,w_2400/')
    ? url.replace('/f_auto,q_auto,c_limit,w_2400/', `/f_auto,q_auto,c_limit,w_${width}/`)
    : url;
}

/**
 * A Cloudinary image scaled to at most `height` pixels tall, never cropped (keeps its own shape). A GIF
 * becomes a light JPEG still, like `croppedUrl`. Other URLs are returned as-is.
 */
export function scaledToHeightUrl(url: string, height: number): string {
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/f_auto,q_auto,c_limit,w_2400/')) return url;
  const options = /\.gif$/i.test(url) ? `pg_${GIF_STILL_FRAME}/f_jpg,q_auto,c_limit,h_${height}` : `f_auto,q_auto,c_limit,h_${height}`;
  return url.replace('/f_auto,q_auto,c_limit,w_2400/', `/${options}/`);
}

/** A Cloudinary image scaled down to at most `height` pixels tall (never cropped); other URLs as-is. */
export function fitHeightUrl(url: string, height: number): string {
  return url.includes('res.cloudinary.com') && url.includes('/image/upload/f_auto,q_auto,c_limit,w_2400/')
    ? url.replace('/f_auto,q_auto,c_limit,w_2400/', `/f_auto,q_auto,c_limit,h_${height}/`)
    : url;
}

/** Why a file can't be uploaded, or null if it's fine. */
export function imageFileProblem(file: File): string | null {
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) return 'Please choose an image file.';
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return `Image is too large (max ${MAX_UPLOAD_MB} MB).`;
  return null;
}

/** Sends one file straight to Cloudinary using a signature from our API. */
export async function uploadToCloudinary(file: File, sig: UploadSignature): Promise<CloudinaryUpload> {
  const body = new FormData();
  body.append('file', file);
  body.append('api_key', sig.apiKey);
  body.append('timestamp', String(sig.timestamp));
  body.append('signature', sig.signature);
  body.append('folder', sig.folder);
  body.append('allowed_formats', sig.allowed_formats);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.secure_url) {
    throw new Error(data?.error?.message ? `Upload failed: ${data.error.message}` : 'Upload failed. Please try again.');
  }
  return data as CloudinaryUpload;
}

/** Dashboard upload: signed by the admin API; returns the URL to save. */
export async function uploadImage(file: File): Promise<string> {
  const problem = imageFileProblem(file);
  if (problem) throw new Error(problem);
  const sig = await adminApi.getUploadSignature() as UploadSignature;
  return optimizedImageUrl((await uploadToCloudinary(file, sig)).secure_url);
}
