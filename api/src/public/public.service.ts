import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SINGLETON_SETTINGS_ID = 'singleton';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

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

  getStory() {
    return this.prisma.storyTimelineItem.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  getEvents() {
    return this.prisma.weddingEvent.findMany({
      orderBy: { displayOrder: 'asc' },
    });
  }

  getSchedule() {
    return this.prisma.scheduleItem.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  getFaqs() {
    return this.prisma.faqItem.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  getGallery() {
    return this.prisma.galleryImage.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  getContact() {
    return this.prisma.contactPerson.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    });
  }
}
