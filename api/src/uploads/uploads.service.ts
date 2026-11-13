import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseCloudinaryUrl, signParams } from './cloudinary';

export const UPLOAD_FOLDER = 'calessa';
export const ALLOWED_FORMATS = 'jpg,jpeg,png,webp,gif,avif,heic,heif';

@Injectable()
export class UploadsService {
  constructor(private readonly config: ConfigService) {}

  /** Signs a single direct-to-Cloudinary image upload. The secret never leaves the API. */
  createSignature() {
    const cloudinary = parseCloudinaryUrl(this.config.get<string>('CLOUDINARY_URL'));
    if (!cloudinary) {
      throw new ServiceUnavailableException('Image uploads are not configured: CLOUDINARY_URL is not set on the API.');
    }

    const params = {
      allowed_formats: ALLOWED_FORMATS,
      folder: UPLOAD_FOLDER,
      timestamp: Math.floor(Date.now() / 1000),
    };

    return {
      cloudName: cloudinary.cloudName,
      apiKey: cloudinary.apiKey,
      ...params,
      signature: signParams(params, cloudinary.apiSecret),
    };
  }
}
