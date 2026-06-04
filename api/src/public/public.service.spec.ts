import { Test, TestingModule } from '@nestjs/testing';
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
  galleryImage: { findMany: jest.fn() },
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
      mockPrisma.storyTimelineItem.findMany.mockResolvedValue([]);
      await service.getStory();
      expect(mockPrisma.storyTimelineItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isPublished: true }, orderBy: { displayOrder: 'asc' } }),
      );
    });
  });

  describe('getEvents', () => {
    it('returns all events ordered by displayOrder', async () => {
      mockPrisma.weddingEvent.findMany.mockResolvedValue([]);
      await service.getEvents();
      expect(mockPrisma.weddingEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { displayOrder: 'asc' } }),
      );
    });
  });

  describe('getSchedule', () => {
    it('returns only published items', async () => {
      mockPrisma.scheduleItem.findMany.mockResolvedValue([]);
      await service.getSchedule();
      expect(mockPrisma.scheduleItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isPublished: true } }),
      );
    });
  });

  describe('getFaqs', () => {
    it('returns only published FAQs', async () => {
      mockPrisma.faqItem.findMany.mockResolvedValue([]);
      await service.getFaqs();
      expect(mockPrisma.faqItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isPublished: true } }),
      );
    });
  });

  describe('getGallery', () => {
    it('returns only published images', async () => {
      mockPrisma.galleryImage.findMany.mockResolvedValue([]);
      await service.getGallery();
      expect(mockPrisma.galleryImage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isPublished: true } }),
      );
    });
  });

  describe('getContact', () => {
    it('returns only published contacts', async () => {
      mockPrisma.contactPerson.findMany.mockResolvedValue([]);
      await service.getContact();
      expect(mockPrisma.contactPerson.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isPublished: true } }),
      );
    });
  });
});
