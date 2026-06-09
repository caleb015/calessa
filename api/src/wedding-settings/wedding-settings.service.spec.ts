import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
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
  requireUniqueTableNumbers: false,
  requireUniqueTableNames: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  weddingSettings: {
    upsert: jest.fn(),
  },
  seatingTable: {
    groupBy: jest.fn(),
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
      const { update } = mockPrisma.weddingSettings.upsert.mock.calls.at(-1)[0];
      expect(update.weddingDate).toBeInstanceOf(Date);
      expect(update.weddingDate.toISOString()).toBe('2026-12-31T17:00:00.000Z');
    });

    it('converts rsvpDeadline string to Date', async () => {
      mockPrisma.weddingSettings.upsert.mockResolvedValue(mockSettings);
      await service.update({ rsvpDeadline: '2026-11-30T23:59:59.000Z' });
      const { update } = mockPrisma.weddingSettings.upsert.mock.calls.at(-1)[0];
      expect(update.rsvpDeadline).toBeInstanceOf(Date);
    });

    it('does not set weddingDate when not provided', async () => {
      mockPrisma.weddingSettings.upsert.mockResolvedValue(mockSettings);
      await service.update({ coupleNameA: 'Cal' });
      const { update } = mockPrisma.weddingSettings.upsert.mock.calls.at(-1)[0];
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

  describe('table uniqueness toggles', () => {
    it('blocks turning on requireUniqueTableNumbers when duplicate numbers exist', async () => {
      mockPrisma.weddingSettings.upsert.mockResolvedValue(mockSettings);
      mockPrisma.seatingTable.groupBy.mockResolvedValue([{ tableNumber: 2, _count: { _all: 2 } }]);
      await expect(service.update({ requireUniqueTableNumbers: true })).rejects.toThrow(ConflictException);
      expect(mockPrisma.seatingTable.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ by: ['tableNumber'] }),
      );
    });

    it('allows turning on requireUniqueTableNumbers when numbers are already unique', async () => {
      mockPrisma.weddingSettings.upsert.mockResolvedValue(mockSettings);
      mockPrisma.seatingTable.groupBy.mockResolvedValue([
        { tableNumber: 1, _count: { _all: 1 } },
        { tableNumber: 2, _count: { _all: 1 } },
      ]);
      await expect(service.update({ requireUniqueTableNumbers: true })).resolves.toEqual(mockSettings);
    });

    it('does not check for duplicates when requireUniqueTableNumbers is already on', async () => {
      mockPrisma.weddingSettings.upsert.mockResolvedValue({ ...mockSettings, requireUniqueTableNumbers: true });
      await service.update({ requireUniqueTableNumbers: true, coupleNameA: 'Cal' });
      expect(mockPrisma.seatingTable.groupBy).not.toHaveBeenCalled();
    });

    it('does not check for duplicates when turning requireUniqueTableNumbers off', async () => {
      mockPrisma.weddingSettings.upsert.mockResolvedValue({ ...mockSettings, requireUniqueTableNumbers: true });
      await service.update({ requireUniqueTableNumbers: false });
      expect(mockPrisma.seatingTable.groupBy).not.toHaveBeenCalled();
    });

    it('blocks turning on requireUniqueTableNames when duplicate names exist', async () => {
      mockPrisma.weddingSettings.upsert.mockResolvedValue(mockSettings);
      mockPrisma.seatingTable.groupBy.mockResolvedValue([{ name: 'Table 2', _count: { _all: 2 } }]);
      await expect(service.update({ requireUniqueTableNames: true })).rejects.toThrow(ConflictException);
      expect(mockPrisma.seatingTable.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ by: ['name'] }),
      );
    });

    it('allows turning on requireUniqueTableNames when names are already unique', async () => {
      mockPrisma.weddingSettings.upsert.mockResolvedValue(mockSettings);
      mockPrisma.seatingTable.groupBy.mockResolvedValue([
        { name: 'Table 1', _count: { _all: 1 } },
        { name: 'Table 2', _count: { _all: 1 } },
      ]);
      await expect(service.update({ requireUniqueTableNames: true })).resolves.toEqual(mockSettings);
    });
  });
});
