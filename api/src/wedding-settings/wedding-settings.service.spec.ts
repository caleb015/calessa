import { Test, TestingModule } from '@nestjs/testing';
import { WeddingSettingsService } from './wedding-settings.service';
import { PrismaService } from '../prisma/prisma.service';

const mockSettings = {
  id: 'singleton',
  coupleNameA: 'Caleb',
  coupleNameB: 'Raissa',
  weddingDate: null,
  rsvpDeadline: null,
  siteTitle: null,
  siteDescription: null,
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
  weddingSettings: {
    upsert: jest.fn(),
  },
};

describe('WeddingSettingsService', () => {
  let service: WeddingSettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeddingSettingsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WeddingSettingsService>(WeddingSettingsService);
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('upserts with singleton id and returns settings', async () => {
      mockPrisma.weddingSettings.upsert.mockResolvedValue(mockSettings);
      const result = await service.get();
      expect(mockPrisma.weddingSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'singleton' } }),
      );
      expect(result).toEqual(mockSettings);
    });
  });

  describe('update', () => {
    it('passes scalar fields through to upsert', async () => {
      mockPrisma.weddingSettings.upsert.mockResolvedValue(mockSettings);
      await service.update({ coupleNameA: 'Cal', isPublic: false });
      expect(mockPrisma.weddingSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ coupleNameA: 'Cal', isPublic: false }),
        }),
      );
    });

    it('converts weddingDate string to Date', async () => {
      mockPrisma.weddingSettings.upsert.mockResolvedValue(mockSettings);
      await service.update({ weddingDate: '2026-12-31T17:00:00.000Z' });
      const { update } = mockPrisma.weddingSettings.upsert.mock.calls[0][0];
      expect(update.weddingDate).toBeInstanceOf(Date);
      expect(update.weddingDate.toISOString()).toBe('2026-12-31T17:00:00.000Z');
    });

    it('converts rsvpDeadline string to Date', async () => {
      mockPrisma.weddingSettings.upsert.mockResolvedValue(mockSettings);
      await service.update({ rsvpDeadline: '2026-11-30T23:59:59.000Z' });
      const { update } = mockPrisma.weddingSettings.upsert.mock.calls[0][0];
      expect(update.rsvpDeadline).toBeInstanceOf(Date);
    });

    it('does not set weddingDate when not provided', async () => {
      mockPrisma.weddingSettings.upsert.mockResolvedValue(mockSettings);
      await service.update({ coupleNameA: 'Cal' });
      const { update } = mockPrisma.weddingSettings.upsert.mock.calls[0][0];
      expect(update.weddingDate).toBeUndefined();
    });

    it('always targets the singleton id', async () => {
      mockPrisma.weddingSettings.upsert.mockResolvedValue(mockSettings);
      await service.update({ isRsvpEnabled: false });
      expect(mockPrisma.weddingSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'singleton' } }),
      );
    });
  });
});
