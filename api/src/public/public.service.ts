import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EVENT_SELECT } from '../content/event-select';

const SINGLETON_SETTINGS_ID = 'singleton';

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
      select: {
        id: true, title: true, description: true, imageUrl: true, displayOrder: true,
        guest: { select: { primaryName: true } },
      },
    });
    // Guest uploads are credited by name only; no guest ids or other details are exposed.
    return images.map(({ guest, ...image }) => ({ ...image, sharedBy: guest?.primaryName ?? null }));
  }

  async getContact(preview = false) {
    await this.assertSitePublic(preview);
    return this.prisma.contactPerson.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    });
  }
}
