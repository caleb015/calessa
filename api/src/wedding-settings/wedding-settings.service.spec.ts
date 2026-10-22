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
  weddingEvent: {
    findMany: jest.fn(),
    update: jest.fn((args) => args),
  },
  $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
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
    mockPrisma.weddingEvent.findMany.mockResolvedValue([]);
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

  describe('event date sync', () => {
    beforeEach(() => mockPrisma.weddingSettings.upsert.mockResolvedValue(mockSettings));

    it('moves events to the new wedding date, keeping Manila time of day and duration', async () => {
      mockPrisma.weddingEvent.findMany.mockResolvedValue([
        // Jan 1 2027, 1:00–2:00 AM Manila
        { id: 'ceremony', startTime: new Date('2026-12-31T17:00:00.000Z'), endTime: new Date('2026-12-31T18:00:00.000Z') },
        // Jan 1 2027, 3:00 PM Manila, ends after midnight Jan 2
        { id: 'reception', startTime: new Date('2027-01-01T07:00:00.000Z'), endTime: new Date('2027-01-01T17:00:00.000Z') },
      ]);

      // Feb 12 2027, 3:00 PM Manila
      await service.update({ weddingDate: '2027-02-12T07:00:00.000Z' });

      const updates = mockPrisma.weddingEvent.update.mock.calls.map(([a]) => a);
      expect(updates).toEqual([
        { where: { id: 'ceremony' }, data: {
          startTime: new Date('2027-02-11T17:00:00.000Z'), // Feb 12, 1:00 AM Manila
          endTime: new Date('2027-02-11T18:00:00.000Z'),
        } },
        { where: { id: 'reception' }, data: {
          startTime: new Date('2027-02-12T07:00:00.000Z'), // Feb 12, 3:00 PM Manila
          endTime: new Date('2027-02-12T17:00:00.000Z'),   // Feb 13, 1:00 AM Manila
        } },
      ]);
    });

    it('leaves endTime null when the event has none', async () => {
      mockPrisma.weddingEvent.findMany.mockResolvedValue([
        { id: 'e1', startTime: new Date('2026-12-31T09:00:00.000Z'), endTime: null },
      ]);
      await service.update({ weddingDate: '2027-02-12T07:00:00.000Z' });
      expect(mockPrisma.weddingEvent.update.mock.calls[0][0].data.endTime).toBeNull();
    });

    it('does not touch events when weddingDate is not in the update', async () => {
      await service.update({ coupleNameA: 'Cal' });
      expect(mockPrisma.weddingEvent.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.weddingEvent.update).not.toHaveBeenCalled();
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
