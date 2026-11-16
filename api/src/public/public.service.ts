import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EVENT_SELECT } from '../content/event-select';
import { GALLERY_PAGE_SIZE } from './dto/gallery-page.dto';

const SINGLETON_SETTINGS_ID = 'singleton';

const GALLERY_PUBLIC_FIELDS = {
  id: true, title: true, description: true, imageUrl: true, displayOrder: true,
  guest: { select: { primaryName: true } },
} as const;

/** Guest uploads are credited by name only; no guest ids or other details are exposed. */
function creditGuest<T extends { guest: { primaryName: string } | null }>({ guest, ...image }: T) {
  return { ...image, sharedBy: guest?.primaryName ?? null };
}

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertSitePublic(preview = false) {
    if (preview) return;
    const settings = await this.prisma.weddingSettings.findUnique({
      where: { id: SINGLETON_SETTINGS_ID },
      select: { isPublic: true },
    });
    if (settings && !settings.isPublic) {
      throw new ServiceUnavailableException('The website is not currently available');
    }
  }

  async getSettings() {
    const settings = await this.prisma.weddingSettings.findUnique({
      where: { id: SINGLETON_SETTINGS_ID },
    });
    if (!settings) return null;

    // Only expose fields safe for public consumption
    const {
      coupleNameA, coupleNameB, weddingDate, siteTitle,
      siteDescription, heroImageUrl, heroImageOffsetX, heroImageOffsetY, heroImageHeight, monogramUrl, rsvpTagline, rsvpSubtext, welcomeMessage,
      themeBackground, themeForeground, themeMuted, themeAccent, themeBorder,
      themeSurface, themeInverseBackground, themeOverlayText, themeOverlayScrim,
      isPublic, isRsvpEnabled, allowMaybe,
      enableMealPreference, enableSongRequest, enableGuestbook,
    } = settings;

    return {
      coupleNameA, coupleNameB, weddingDate, siteTitle,
      siteDescription, heroImageUrl, heroImageOffsetX, heroImageOffsetY, heroImageHeight, monogramUrl, rsvpTagline, rsvpSubtext, welcomeMessage,
      themeBackground, themeForeground, themeMuted, themeAccent, themeBorder,
      themeSurface, themeInverseBackground, themeOverlayText, themeOverlayScrim,
      isPublic, isRsvpEnabled, allowMaybe,
      enableMealPreference, enableSongRequest, enableGuestbook,
    };
  }

  async getStory(preview = false) {
    await this.assertSitePublic(preview);
    return this.prisma.storyTimelineItem.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async getEvents(preview = false) {
    await this.assertSitePublic(preview);
    return this.prisma.weddingEvent.findMany({
      orderBy: { displayOrder: 'asc' },
      select: EVENT_SELECT,
    });
  }

  async getSchedule(preview = false) {
    await this.assertSitePublic(preview);
    return this.prisma.scheduleItem.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async getFaqs(preview = false) {
    await this.assertSitePublic(preview);
    return this.prisma.faqItem.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async getGallery(preview = false) {
    await this.assertSitePublic(preview);
    const images = await this.prisma.galleryImage.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
      select: GALLERY_PUBLIC_FIELDS,
    });
    return images.map(creditGuest);
  }

  /** One page of published photos plus the total, so the gallery can load more as visitors scroll. */
  async getGalleryPage(preview = false, offset = 0, limit = GALLERY_PAGE_SIZE) {
    await this.assertSitePublic(preview);
    const where = { isPublished: true };
    const [images, total] = await Promise.all([
      this.prisma.galleryImage.findMany({
        where,
        // Ties broken by age and id so photos never repeat or go missing between pages.
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        skip: offset,
        take: limit,
        select: GALLERY_PUBLIC_FIELDS,
      }),
      this.prisma.galleryImage.count({ where }),
    ]);
    return { images: images.map(creditGuest), total };
  }

  async getContact(preview = false) {
    await this.assertSitePublic(preview);
    return this.prisma.contactPerson.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    });
  }
}
