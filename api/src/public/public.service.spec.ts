import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { PublicService } from './public.service';
import { PrismaService } from '../prisma/prisma.service';

const mockSettings = {
  id: 'singleton',
  coupleNameA: 'Caleb',
  coupleNameB: 'Raissa',
  weddingDate: null,
  rsvpDeadline: new Date(),
  siteTitle: 'Caleb & Raissa',
  siteDescription: 'Our wedding',
  heroImageUrl: null,
  heroImageOffsetX: null,
  heroImageOffsetY: null,
  heroImageHeight: null,
  monogramUrl: null,
  rsvpTagline: null,
  rsvpSubtext: null,
  themeBackground: null,
  themeForeground: null,
  themeMuted: null,
  themeAccent: null,
  themeBorder: null,
  themeSurface: null,
  themeInverseBackground: null,
  themeOverlayText: null,
  themeOverlayScrim: null,
  welcomeMessage: null,
  isPublic: true,
  isRsvpEnabled: true,
  allowMaybe: false,
  enableMealPreference: true,
  enableSongRequest: true,
  enableGuestbook: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  weddingSettings: { findUnique: jest.fn() },
  storyTimelineItem: { findMany: jest.fn() },
  weddingEvent: { findMany: jest.fn() },
  scheduleItem: { findMany: jest.fn() },
  faqItem: { findMany: jest.fn() },
  galleryImage: { findMany: jest.fn(), count: jest.fn() },
  contactPerson: { findMany: jest.fn() },
};

describe('PublicService', () => {
  let service: PublicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PublicService>(PublicService);
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('returns only public-safe fields', async () => {
      mockPrisma.weddingSettings.findUnique.mockResolvedValue(mockSettings);
      const result = await service.getSettings();
      expect(result).toHaveProperty('coupleNameA');
      expect(result).toHaveProperty('isRsvpEnabled');
      expect(result).toHaveProperty('monogramUrl');
      expect(result).toHaveProperty('heroImageOffsetX');
      expect(result).toHaveProperty('heroImageOffsetY');
      expect(result).toHaveProperty('heroImageHeight');
      expect(result).toHaveProperty('rsvpTagline');
      expect(result).toHaveProperty('rsvpSubtext');
      expect(result).toHaveProperty('themeAccent');
      expect(result).toHaveProperty('themeSurface');
      expect(result).toHaveProperty('themeInverseBackground');
      expect(result).toHaveProperty('themeOverlayText');
      expect(result).toHaveProperty('themeOverlayScrim');
      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('rsvpDeadline');
      expect(result).not.toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('updatedAt');
    });

    it('returns null when settings not found', async () => {
      mockPrisma.weddingSettings.findUnique.mockResolvedValue(null);
      const result = await service.getSettings();
      expect(result).toBeNull();
    });
  });

  describe('getStory', () => {
    it('returns only published items ordered by displayOrder', async () => {
      mockPrisma.weddingSettings.findUnique.mockResolvedValue({ isPublic: true });
      mockPrisma.storyTimelineItem.findMany.mockResolvedValue([]);
      await service.getStory();
      expect(mockPrisma.storyTimelineItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isPublished: true }, orderBy: { displayOrder: 'asc' } }),
      );
    });

    it('throws ServiceUnavailableException when isPublic is false', async () => {
      mockPrisma.weddingSettings.findUnique.mockResolvedValue({ isPublic: false });
      await expect(service.getStory()).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('getEvents', () => {
    it('returns all events ordered by displayOrder', async () => {
      mockPrisma.weddingSettings.findUnique.mockResolvedValue({ isPublic: true });
      mockPrisma.weddingEvent.findMany.mockResolvedValue([]);
      await service.getEvents();
      expect(mockPrisma.weddingEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { displayOrder: 'asc' } }),
      );
    });

    it('throws ServiceUnavailableException when isPublic is false', async () => {
      mockPrisma.weddingSettings.findUnique.mockResolvedValue({ isPublic: false });
      await expect(service.getEvents()).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('getSchedule', () => {
    it('returns only published items', async () => {
      mockPrisma.weddingSettings.findUnique.mockResolvedValue({ isPublic: true });
      mockPrisma.scheduleItem.findMany.mockResolvedValue([]);
      await service.getSchedule();
      expect(mockPrisma.scheduleItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isPublished: true } }),
      );
    });

    it('throws ServiceUnavailableException when isPublic is false', async () => {
      mockPrisma.weddingSettings.findUnique.mockResolvedValue({ isPublic: false });
      await expect(service.getSchedule()).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('getFaqs', () => {
    it('returns only published FAQs', async () => {
      mockPrisma.weddingSettings.findUnique.mockResolvedValue({ isPublic: true });
      mockPrisma.faqItem.findMany.mockResolvedValue([]);
      await service.getFaqs();
      expect(mockPrisma.faqItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isPublished: true } }),
      );
    });

    it('throws ServiceUnavailableException when isPublic is false', async () => {
      mockPrisma.weddingSettings.findUnique.mockResolvedValue({ isPublic: false });
      await expect(service.getFaqs()).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('getGallery', () => {
    it('returns only published images', async () => {
      mockPrisma.weddingSettings.findUnique.mockResolvedValue({ isPublic: true });
      mockPrisma.galleryImage.findMany.mockResolvedValue([]);
      await service.getGallery();
      expect(mockPrisma.galleryImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isPublished: true } }),
      );
    });

    it('throws ServiceUnavailableException when isPublic is false', async () => {
      mockPrisma.weddingSettings.findUnique.mockResolvedValue({ isPublic: false });
      await expect(service.getGallery()).rejects.toThrow(ServiceUnavailableException);
    });

    it('credits guest uploads by name only', async () => {
      mockPrisma.weddingSettings.findUnique.mockResolvedValue({ isPublic: true });
      mockPrisma.galleryImage.findMany.mockResolvedValue([
        { id: 'a', imageUrl: 'a.jpg', guest: { primaryName: 'Maria Santos' } },
        { id: 'b', imageUrl: 'b.jpg', guest: null },
      ]);
      expect(await service.getGallery()).toEqual([
        { id: 'a', imageUrl: 'a.jpg', sharedBy: 'Maria Santos' },
        { id: 'b', imageUrl: 'b.jpg', sharedBy: null },
      ]);
    });
  });

  describe('getGalleryPage', () => {
    it('returns one page of published photos, in a stable order, with the total', async () => {
      mockPrisma.weddingSettings.findUnique.mockResolvedValue({ isPublic: true });
      mockPrisma.galleryImage.findMany.mockResolvedValue([{ id: 'c', imageUrl: 'c.jpg', guest: { primaryName: 'Ana' } }]);
      mockPrisma.galleryImage.count.mockResolvedValue(250);
      expect(await service.getGalleryPage(false, 96, 48)).toEqual({
        images: [{ id: 'c', imageUrl: 'c.jpg', sharedBy: 'Ana' }],
        total: 250,
      });
      expect(mockPrisma.galleryImage.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { isPublished: true },
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        skip: 96,
        take: 48,
      }));
      expect(mockPrisma.galleryImage.count).toHaveBeenCalledWith({ where: { isPublished: true } });
    });

    it('starts at the first page by default', async () => {
      mockPrisma.weddingSettings.findUnique.mockResolvedValue({ isPublic: true });
      mockPrisma.galleryImage.findMany.mockResolvedValue([]);
      mockPrisma.galleryImage.count.mockResolvedValue(0);
      await service.getGalleryPage();
      expect(mockPrisma.galleryImage.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 48 }));
    });

    it('throws ServiceUnavailableException when isPublic is false', async () => {
      mockPrisma.weddingSettings.findUnique.mockResolvedValue({ isPublic: false });
      await expect(service.getGalleryPage()).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('getContact', () => {
    it('returns only published contacts', async () => {
      mockPrisma.weddingSettings.findUnique.mockResolvedValue({ isPublic: true });
      mockPrisma.contactPerson.findMany.mockResolvedValue([]);
      await service.getContact();
      expect(mockPrisma.contactPerson.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isPublished: true } }),
      );
    });

    it('throws ServiceUnavailableException when isPublic is false', async () => {
      mockPrisma.weddingSettings.findUnique.mockResolvedValue({ isPublic: false });
      await expect(service.getContact()).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
