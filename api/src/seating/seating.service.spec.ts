import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SeatingService } from './seating.service';
import { PrismaService } from '../prisma/prisma.service';

const mockTable = { id: 'table-1', name: 'Table 1', capacity: 8, notes: null, assignments: [] };
const mockGuest = { id: 'guest-1', primaryName: 'Juan', invitationCode: 'CODE001', seatingAssignment: null };
const mockAssignment = { id: 'assign-1', guestId: 'guest-1', tableId: 'table-1', seatLabel: null, notes: null };

const mockPrisma = {
  seatingTable: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  seatingAssignment: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  guest: { findMany: jest.fn() },
  weddingSettings: { findFirst: jest.fn() },
};

describe('SeatingService', () => {
  let service: SeatingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SeatingService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<SeatingService>(SeatingService);
    jest.clearAllMocks();
  });

  describe('tables', () => {
    it('findAllTables returns array with assignments', async () => {
      mockPrisma.seatingTable.findMany.mockResolvedValue([mockTable]);
      const result = await service.findAllTables();
      expect(result).toEqual([mockTable]);
    });

    it('findOneTable throws NotFoundException when not found', async () => {
      mockPrisma.seatingTable.findUnique.mockResolvedValue(null);
      await expect(service.findOneTable('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('createTable creates and returns table', async () => {
      mockPrisma.weddingSettings.findFirst.mockResolvedValue(null);
      mockPrisma.seatingTable.create.mockResolvedValue(mockTable);
      const result = await service.createTable({ name: 'Table 1', capacity: 8 });
      expect(result).toEqual(mockTable);
    });
  });

  describe('table uniqueness checks', () => {
    it('skips the duplicate check entirely when no settings row exists', async () => {
      mockPrisma.weddingSettings.findFirst.mockResolvedValue(null);
      mockPrisma.seatingTable.create.mockResolvedValue(mockTable);
      const result = await service.createTable({ name: 'Table 1', capacity: 8, tableNumber: 1 });
      expect(result).toEqual(mockTable);
      expect(mockPrisma.seatingTable.findFirst).not.toHaveBeenCalled();
    });

    it('throws ConflictException when tableNumber is taken and uniqueness is required', async () => {
      mockPrisma.weddingSettings.findFirst.mockResolvedValue({ requireUniqueTableNumbers: true, requireUniqueTableNames: false });
      mockPrisma.seatingTable.findFirst.mockResolvedValue(mockTable);
      await expect(
        service.createTable({ name: 'Table 2', capacity: 8, tableNumber: 1 }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates the table when its number is not taken', async () => {
      mockPrisma.weddingSettings.findFirst.mockResolvedValue({ requireUniqueTableNumbers: true, requireUniqueTableNames: false });
      mockPrisma.seatingTable.findFirst.mockResolvedValue(null);
      mockPrisma.seatingTable.create.mockResolvedValue(mockTable);
      const result = await service.createTable({ name: 'Table 2', capacity: 8, tableNumber: 1 });
      expect(result).toEqual(mockTable);
    });

    it('throws ConflictException when name is taken and uniqueness is required', async () => {
      mockPrisma.weddingSettings.findFirst.mockResolvedValue({ requireUniqueTableNumbers: false, requireUniqueTableNames: true });
      mockPrisma.seatingTable.findFirst.mockResolvedValue(mockTable);
      await expect(
        service.createTable({ name: 'Table 1', capacity: 8 }),
      ).rejects.toThrow(ConflictException);
    });

    it('excludes the table itself from the duplicate lookup on update', async () => {
      mockPrisma.seatingTable.findUnique.mockResolvedValue(mockTable);
      mockPrisma.weddingSettings.findFirst.mockResolvedValue({ requireUniqueTableNumbers: true, requireUniqueTableNames: false });
      mockPrisma.seatingTable.findFirst.mockResolvedValue(null);
      mockPrisma.seatingTable.update.mockResolvedValue({ ...mockTable, tableNumber: 5 });
      await service.updateTable('table-1', { tableNumber: 5 });
      expect(mockPrisma.seatingTable.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: { not: 'table-1' } }) }),
      );
    });
  });

  describe('assignments', () => {
    it('createAssignment throws ConflictException when guest already assigned', async () => {
      mockPrisma.seatingAssignment.findUnique.mockResolvedValue(mockAssignment);
      await expect(
        service.createAssignment({ guestId: 'guest-1', tableId: 'table-1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('createAssignment succeeds when guest not yet assigned', async () => {
      mockPrisma.seatingAssignment.findUnique.mockResolvedValue(null);
      mockPrisma.seatingAssignment.create.mockResolvedValue(mockAssignment);
      const result = await service.createAssignment({ guestId: 'guest-1', tableId: 'table-1' });
      expect(result).toEqual(mockAssignment);
    });

    it('findOneAssignment throws NotFoundException when not found', async () => {
      mockPrisma.seatingAssignment.findUnique.mockResolvedValue(null);
      await expect(service.findOneAssignment('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findUnassignedGuests', () => {
    it('queries guests where seatingAssignment is null', async () => {
      mockPrisma.guest.findMany.mockResolvedValue([mockGuest]);
      const result = await service.findUnassignedGuests();
      expect(result).toEqual([mockGuest]);
      expect(mockPrisma.guest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { seatingAssignment: null } }),
      );
    });
  });
});
