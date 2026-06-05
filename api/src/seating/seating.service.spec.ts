import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SeatingService } from './seating.service';
import { PrismaService } from '../prisma/prisma.service';

const mockTable = { id: 'table-1', name: 'Table 1', capacity: 8, notes: null, assignments: [] };
const mockGuest = { id: 'guest-1', primaryName: 'Juan', invitationCode: 'CODE001', seatingAssignment: null };
const mockAssignment = { id: 'assign-1', guestId: 'guest-1', tableId: 'table-1', seatLabel: null, notes: null };

const mockPrisma = {
  seatingTable: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  seatingAssignment: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  guest: { findMany: jest.fn() },
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
      mockPrisma.seatingTable.create.mockResolvedValue(mockTable);
      const result = await service.createTable({ name: 'Table 1', capacity: 8 });
      expect(result).toEqual(mockTable);
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
