import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GUEST_UPLOAD_FOLDER, UploadsService } from '../uploads/uploads.service';
import { GALLERY_SETTINGS_DEFAULTS, MAX_PHOTOS_PER_GUEST } from './gallery-settings.defaults';
import { UpdateGallerySettingsDto, UploadedImageDto } from './dto/gallery-uploads.dto';

const SINGLETON_ID = 'singleton';

@Injectable()
export class GalleryUploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  private async assertSitePublic(preview: boolean) {
    if (preview) return;
    const settings = await this.prisma.weddingSettings.findUnique({ where: { id: SINGLETON_ID }, select: { isPublic: true } });
    if (settings && !settings.isPublic) {
      throw new ServiceUnavailableException('The website is not currently available');
    }
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  /** Saved settings ('' = use default) plus the defaults. Reading never creates the row. */
  async getSettingsForAdmin() {
    const row = await this.prisma.gallerySettings.findUnique({ where: { id: SINGLETON_ID } });
    return {
      uploadsEnabled: row?.uploadsEnabled ?? true,
      requireApproval: row?.requireApproval ?? true,
      heading: row?.heading ?? '',
      subtext: row?.subtext ?? '',
      buttonLabel: row?.buttonLabel ?? '',
      defaults: GALLERY_SETTINGS_DEFAULTS,
    };
  }

  async updateSettings(dto: UpdateGallerySettingsDto) {
    await this.prisma.gallerySettings.upsert({
      where: { id: SINGLETON_ID },
      update: dto,
      create: { id: SINGLETON_ID, ...dto },
    });
    return this.getSettingsForAdmin();
  }

  // ── Public ─────────────────────────────────────────────────────────────────

  async getPublicSettings(preview = false) {
    await this.assertSitePublic(preview);
    const row = await this.prisma.gallerySettings.findUnique({ where: { id: SINGLETON_ID } });
    return {
      uploadsEnabled: row?.uploadsEnabled ?? true,
      requireApproval: row?.requireApproval ?? true,
      heading: row?.heading || GALLERY_SETTINGS_DEFAULTS.heading,
      subtext: row?.subtext || GALLERY_SETTINGS_DEFAULTS.subtext,
      buttonLabel: row?.buttonLabel || GALLERY_SETTINGS_DEFAULTS.buttonLabel,
    };
  }

  /** The invited guest for this code, if uploads are open. Codes are matched case-insensitively. */
  private async guestForCode(code: string, preview: boolean) {
    await this.assertSitePublic(preview);
    const settings = await this.prisma.gallerySettings.findUnique({ where: { id: SINGLETON_ID } });
    if (settings && !settings.uploadsEnabled) throw new ForbiddenException('Photo sharing is closed.');

    const trimmed = code.trim();
    const select = { id: true, primaryName: true };
    const guest =
      (await this.prisma.guest.findUnique({ where: { invitationCode: trimmed }, select })) ??
      (await this.prisma.guest.findUnique({ where: { invitationCode: trimmed.toUpperCase() }, select }));
    if (!guest) throw new NotFoundException('Invitation code not found');
    return { guest, requireApproval: settings?.requireApproval ?? true };
  }

  /** Confirms the code and returns only the guest's name. */
  async verifyGuest(code: string, preview = false) {
    const { guest } = await this.guestForCode(code, preview);
    return { name: guest.primaryName };
  }

  async createSignature(code: string, preview = false) {
    await this.guestForCode(code, preview);
    return this.uploads.createSignature(GUEST_UPLOAD_FOLDER);
  }

  /** Adds a guest's finished Cloudinary uploads to the gallery (published or pending approval). */
  async addUploads(code: string, images: UploadedImageDto[], preview = false) {
    const { guest, requireApproval } = await this.guestForCode(code, preview);

    if (images.some(image => !this.uploads.isGenuineUpload(image, GUEST_UPLOAD_FOLDER))) {
      throw new BadRequestException('One or more photos could not be verified. Please upload them again.');
    }

    const existing = await this.prisma.galleryImage.count({ where: { guestId: guest.id } });
    if (existing + images.length > MAX_PHOTOS_PER_GUEST) {
      throw new BadRequestException(`Each guest can share up to ${MAX_PHOTOS_PER_GUEST} photos.`);
    }

    // Ignore photos already added (e.g. the guest pressed submit twice).
    const urls = [...new Set(images.map(image => this.uploads.deliveryUrl(image)))];
    const already = await this.prisma.galleryImage.findMany({ where: { imageUrl: { in: urls } }, select: { imageUrl: true } });
    const fresh = urls.filter(url => !already.some(a => a.imageUrl === url));

    const last = await this.prisma.galleryImage.aggregate({ _max: { displayOrder: true } });
    const start = (last._max.displayOrder ?? 0) + 1;
    await this.prisma.galleryImage.createMany({
      data: fresh.map((imageUrl, i) => ({
        imageUrl,
        guestId: guest.id,
        isPublished: !requireApproval,
        // Guest photos appear in the gallery only; the couple picks what goes on the homepage.
        showOnHomepage: false,
        displayOrder: start + i,
      })),
    });

    return { added: fresh.length, pendingApproval: requireApproval };
  }
}
