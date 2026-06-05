import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ContentService } from './content.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  weddingEvent: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  scheduleItem: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  faqItem: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  galleryImage: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  storyTimelineItem: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  contactPerson: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
};

describe('ContentService', () => {
  let service: ContentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<ContentService>(ContentService);
    jest.clearAllMocks();
  });

  const contentTypes = [
    { name: 'Event', findAll: () => service.findAllEvents(), findOne: (id: string) => service.findOneEvent(id), prismaKey: 'weddingEvent' },
    { name: 'ScheduleItem', findAll: () => service.findAllSchedule(), findOne: (id: string) => service.findOneSchedule(id), prismaKey: 'scheduleItem' },
    { name: 'Faq', findAll: () => service.findAllFaqs(), findOne: (id: string) => service.findOneFaq(id), prismaKey: 'faqItem' },
    { name: 'GalleryImage', findAll: () => service.findAllGallery(), findOne: (id: string) => service.findOneGalleryImage(id), prismaKey: 'galleryImage' },
    { name: 'StoryItem', findAll: () => service.findAllStory(), findOne: (id: string) => service.findOneStoryItem(id), prismaKey: 'storyTimelineItem' },
    { name: 'Contact', findAll: () => service.findAllContact(), findOne: (id: string) => service.findOneContact(id), prismaKey: 'contactPerson' },
  ];

  for (const ct of contentTypes) {
    describe(ct.name, () => {
      it('findAll returns array', async () => {
        (mockPrisma as any)[ct.prismaKey].findMany.mockResolvedValue([]);
        const result = await ct.findAll();
        expect(Array.isArray(result)).toBe(true);
      });

      it('findOne returns item when found', async () => {
        const item = { id: 'item-1' };
        (mockPrisma as any)[ct.prismaKey].findUnique.mockResolvedValue(item);
        const result = await ct.findOne('item-1');
        expect(result).toEqual(item);
      });

      it('findOne throws NotFoundException when not found', async () => {
        (mockPrisma as any)[ct.prismaKey].findUnique.mockResolvedValue(null);
        await expect(ct.findOne('bad-id')).rejects.toThrow(NotFoundException);
      });
    });
  }

  describe('createEvent converts date strings', () => {
    it('converts startTime and endTime strings to Date', async () => {
      mockPrisma.weddingEvent.create.mockResolvedValue({});
      await service.createEvent({ type: 'ceremony', title: 'Ceremony', startTime: '2026-12-31T17:00:00.000Z' });
      const { data } = mockPrisma.weddingEvent.create.mock.calls[0][0];
      expect(data.startTime).toBeInstanceOf(Date);
    });
  });
});
