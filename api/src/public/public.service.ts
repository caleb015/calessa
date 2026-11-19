import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EVENT_SELECT } from '../content/event-select';
import { GALLERY_PAGE_SIZE } from './dto/gallery-page.dto';
import { HOMEPAGE_GALLERY_PAGE_SIZE, MAX_SHUFFLE_SEED } from './dto/homepage-gallery.dto';

const SINGLETON_SETTINGS_ID = 'singleton';

const GALLERY_PUBLIC_FIELDS = {
  id: true, title: true, description: true, imageUrl: true, displayOrder: true,
  guest: { select: { primaryName: true } },
} as const;

/** A repeatable random number generator: the same seed always gives the same sequence. */
function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shuffles a copy of `items` the same way every time for a given seed. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  const random = seededRandom(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

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
      siteDescription, heroImageUrl, heroImageOffsetX, heroImageOffsetY, heroImageHeight, monogramUrl, rsvpHeading, rsvpTagline, rsvpSubtext, welcomeMessage,
      welcomeImageUrl, rsvpBannerImageUrl,
      themeBackground, themeForeground, themeMuted, themeAccent, themeBorder,
      themeSurface, themeInverseBackground, themeOverlayText, themeOverlayScrim,
      fontHeading, fontHeadingUrl, fontBody, fontBodyUrl, fontAccent, fontAccentUrl,
      isPublic, isRsvpEnabled, allowMaybe,
      enableMealPreference, enableSongRequest, enableGuestbook,
    } = settings;

    return {
      coupleNameA, coupleNameB, weddingDate, siteTitle,
      siteDescription, heroImageUrl, heroImageOffsetX, heroImageOffsetY, heroImageHeight, monogramUrl, rsvpHeading, rsvpTagline, rsvpSubtext, welcomeMessage,
      welcomeImageUrl, rsvpBannerImageUrl,
      themeBackground, themeForeground, themeMuted, themeAccent, themeBorder,
      themeSurface, themeInverseBackground, themeOverlayText, themeOverlayScrim,
      fontHeading, fontHeadingUrl, fontBody, fontBodyUrl, fontAccent, fontAccentUrl,
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

  /**
   * One page of the published photos ticked "Show on homepage" (the homepage's Moments slider; there is
   * no limit on how many). In random order when the couple turned that on: the first page hands out a
   * `seed`, and later pages that send it back continue the same shuffle, so nothing repeats or goes missing.
   */
  async getHomepageGallery(preview = false, offset = 0, limit = HOMEPAGE_GALLERY_PAGE_SIZE, seed?: number) {
    await this.assertSitePublic(preview);
    const where = { isPublished: true, showOnHomepage: true };
    const orderBy = [{ displayOrder: 'asc' as const }, { createdAt: 'asc' as const }, { id: 'asc' as const }];
    const settings = await this.prisma.weddingSettings.findUnique({
      where: { id: SINGLETON_SETTINGS_ID },
      select: { homepageGalleryShuffle: true },
    });

    if (!settings?.homepageGalleryShuffle) {
      const [images, total] = await Promise.all([
        this.prisma.galleryImage.findMany({ where, orderBy, skip: offset, take: limit, select: GALLERY_PUBLIC_FIELDS }),
        this.prisma.galleryImage.count({ where }),
      ]);
      return { images: images.map(creditGuest), total, seed: null };
    }

    // Shuffle just the ids (cheap even for thousands of photos), then load only this page's photos.
    const order = seed ?? 1 + Math.floor(Math.random() * MAX_SHUFFLE_SEED);
    const ids = (await this.prisma.galleryImage.findMany({ where, orderBy, select: { id: true } })).map(r => r.id);
    const pageIds = seededShuffle(ids, order).slice(offset, offset + limit);
    const rows = pageIds.length
      ? await this.prisma.galleryImage.findMany({ where: { ...where, id: { in: pageIds } }, select: GALLERY_PUBLIC_FIELDS })
      : [];
    const byId = new Map(rows.map(r => [r.id, r]));
    const images = pageIds.map(id => byId.get(id)).filter((r): r is NonNullable<typeof r> => !!r).map(creditGuest);
    return { images, total: ids.length, seed: order };
  }

  async getContact(preview = false) {
    await this.assertSitePublic(preview);
    return this.prisma.contactPerson.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    });
  }
}
