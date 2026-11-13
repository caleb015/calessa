import { adminApi } from '@/lib/adminApi';

export const MAX_UPLOAD_MB = 10; // Cloudinary free plan limit per image

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  signature: string;
  timestamp: number;
  folder: string;
  allowed_formats: string;
}

/**
 * Cloudinary serves whatever it stores; these options make it send a compressed copy in the best
 * format for the browser (e.g. WebP), no wider than 2400px, instead of the full-size original.
 */
export function optimizedImageUrl(secureUrl: string): string {
  return secureUrl.replace('/image/upload/', '/image/upload/f_auto,q_auto,c_limit,w_2400/');
}

/** Uploads an image straight to Cloudinary (signed by our API) and returns the URL to save. */
export async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
    throw new Error('Please choose an image file.');
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    throw new Error(`Image is too large (max ${MAX_UPLOAD_MB} MB).`);
  }

  const sig = await adminApi.getUploadSignature() as UploadSignature;

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
  return optimizedImageUrl(data.secure_url);
}
