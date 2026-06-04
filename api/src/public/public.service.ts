import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SINGLETON_SETTINGS_ID = 'singleton';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertSitePublic() {
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
      siteDescription, heroImageUrl, welcomeMessage,
      isPublic, isRsvpEnabled, allowMaybe,
      enableMealPreference, enableSongRequest, enableGuestbook,
    } = settings;

    return {
      coupleNameA, coupleNameB, weddingDate, siteTitle,
      siteDescription, heroImageUrl, welcomeMessage,
      isPublic, isRsvpEnabled, allowMaybe,
      enableMealPreference, enableSongRequest, enableGuestbook,
    };
  }

  async getStory() {
    await this.assertSitePublic();
    return this.prisma.storyTimelineItem.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async getEvents() {
    await this.assertSitePublic();
    return this.prisma.weddingEvent.findMany({
      orderBy: { displayOrder: 'asc' },
    });
  }

  async getSchedule() {
    await this.assertSitePublic();
    return this.prisma.scheduleItem.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async getFaqs() {
    await this.assertSitePublic();
    return this.prisma.faqItem.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async getGallery() {
    await this.assertSitePublic();
    return this.prisma.galleryImage.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async getContact() {
    await this.assertSitePublic();
    return this.prisma.contactPerson.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    });
  }
}
