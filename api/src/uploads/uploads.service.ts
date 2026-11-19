import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudinaryConfig, parseCloudinaryUrl, signParams } from './cloudinary';

export const UPLOAD_FOLDER = 'calessa';
export const GUEST_UPLOAD_FOLDER = 'calessa/guest-uploads';
export const ALLOWED_FORMATS = 'jpg,jpeg,png,webp,gif,avif,heic,heif';
/** Font files for the site's custom fonts, stored as Cloudinary "raw" files (not images). */
export const FONT_UPLOAD_FOLDER = 'calessa/fonts';
export const FONT_FORMATS = 'woff2,woff,ttf,otf';

/** Details Cloudinary returns for a finished upload, used to prove it came from our account. */
export interface UploadedImage {
  publicId: string;
  version: number;
  signature: string;
  format: string;
}

@Injectable()
export class UploadsService {
  constructor(private readonly config: ConfigService) {}

  private cloudinary(): CloudinaryConfig {
    const cloudinary = parseCloudinaryUrl(this.config.get<string>('CLOUDINARY_URL'));
    if (!cloudinary) {
      throw new ServiceUnavailableException('Image uploads are not configured: CLOUDINARY_URL is not set on the API.');
    }
    return cloudinary;
  }

  /** Signs a direct-to-Cloudinary image upload into `folder`. The secret never leaves the API. */
  createSignature(folder = UPLOAD_FOLDER) {
    return this.sign({ allowed_formats: ALLOWED_FORMATS, folder });
  }

  /** Signs a direct-to-Cloudinary font file upload (a "raw" file) into the fonts folder. */
  createFontSignature() {
    return { ...this.sign({ allowed_formats: FONT_FORMATS, folder: FONT_UPLOAD_FOLDER }), resourceType: 'raw' as const };
  }

  private sign(fields: { allowed_formats: string; folder: string }) {
    const cloudinary = this.cloudinary();
    const params = { ...fields, timestamp: Math.floor(Date.now() / 1000) };
    return {
      cloudName: cloudinary.cloudName,
      apiKey: cloudinary.apiKey,
      ...params,
      signature: signParams(params, cloudinary.apiSecret),
    };
  }

  /**
   * True when Cloudinary's response signature matches (sha1 of public_id + version + secret),
   * i.e. the image really was uploaded to our account, and it sits in the expected folder.
   */
  isGenuineUpload(image: UploadedImage, folder: string): boolean {
    const { apiSecret } = this.cloudinary();
    return (
      image.publicId.startsWith(`${folder}/`) &&
      ALLOWED_FORMATS.split(',').includes(image.format.toLowerCase()) &&
      signParams({ public_id: image.publicId, version: image.version }, apiSecret) === image.signature
    );
  }

  /** Same optimized delivery URL the dashboard saves for admin uploads. */
  deliveryUrl(image: UploadedImage): string {
    const { cloudName } = this.cloudinary();
    return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,c_limit,w_2400/v${image.version}/${image.publicId}.${image.format}`;
  }
}
