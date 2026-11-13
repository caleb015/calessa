import { createHash } from 'crypto';

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/** Parses the CLOUDINARY_URL shown on the Cloudinary dashboard: cloudinary://<key>:<secret>@<cloud name> */
export function parseCloudinaryUrl(url: string | undefined): CloudinaryConfig | null {
  const match = url?.trim().match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!match) return null;
  const [, apiKey, apiSecret, cloudName] = match;
  return { cloudName, apiKey, apiSecret };
}

/** Cloudinary's upload signature: SHA-1 of the params sorted by key, joined as k=v&..., plus the secret. */
export function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(toSign + apiSecret).digest('hex');
}
