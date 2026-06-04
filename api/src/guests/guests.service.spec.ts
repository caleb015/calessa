import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { GuestsService } from './guests.service';
import { PrismaService } from '../prisma/prisma.service';

const mockGuest = {
  id: 'guest-1',
  primaryName: 'Juan dela Cruz',
  email: 'juan@example.com',
  phone: null,
  group: 'Family',
  allowedPartySize: 2,
  plusOneAllowed: true,
  invitationCode: 'TESTCODE',
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  rsvp: null,
};

const mockPrisma = {
  guest: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('GuestsService', () => {
  let service: GuestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<GuestsService>(GuestsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns all guests ordered by createdAt desc', async () => {
      mockPrisma.guest.findMany.mockResolvedValue([mockGuest]);
      const result = await service.findAll();
      expect(result).toEqual([mockGuest]);
      expect(mockPrisma.guest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });
  });

  describe('findOne', () => {
    it('returns guest when found', async () => {
      mockPrisma.guest.findUnique.mockResolvedValue(mockGuest);
      const result = await service.findOne('guest-1');
      expect(result).toEqual(mockGuest);
    });

    it('throws NotFoundException when guest not found', async () => {
      mockPrisma.guest.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('auto-generates invitation code when not provided', async () => {
      mockPrisma.guest.findUnique.mockResolvedValue(null);
      mockPrisma.guest.create.mockResolvedValue(mockGuest);
      await service.create({ primaryName: 'Test' });
      const { data } = mockPrisma.guest.create.mock.calls[0][0];
      expect(data.invitationCode).toBeDefined();
      expect(typeof data.invitationCode).toBe('string');
      expect(data.invitationCode.length).toBe(8);
    });

    it('uses provided invitation code', async () => {
      mockPrisma.guest.findUnique.mockResolvedValue(null);
      mockPrisma.guest.create.mockResolvedValue(mockGuest);
      await service.create({ primaryName: 'Test', invitationCode: 'MYCODE12' });
      const { data } = mockPrisma.guest.create.mock.calls[0][0];
      expect(data.invitationCode).toBe('MYCODE12');
    });

    it('throws ConflictException when provided code already exists', async () => {
      mockPrisma.guest.findUnique.mockResolvedValue(mockGuest);
      await expect(
        service.create({ primaryName: 'Test', invitationCode: 'TESTCODE' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when all 10 auto-generate attempts collide', async () => {
      mockPrisma.guest.findUnique.mockResolvedValue(mockGuest); // always collides
      await expect(service.create({ primaryName: 'Test' })).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates guest fields', async () => {
      mockPrisma.guest.findUnique.mockResolvedValue(mockGuest);
      mockPrisma.guest.update.mockResolvedValue({ ...mockGuest, primaryName: 'Updated' });
      const result = await service.update('guest-1', { primaryName: 'Updated' });
      expect(result.primaryName).toBe('Updated');
    });

    it('throws NotFoundException when guest not found', async () => {
      mockPrisma.guest.findUnique.mockResolvedValue(null);
      await expect(service.update('bad-id', { primaryName: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when new invitation code belongs to another guest', async () => {
      const otherGuest = { ...mockGuest, id: 'guest-2' };
      mockPrisma.guest.findUnique
        .mockResolvedValueOnce(mockGuest)   // findOne check
        .mockResolvedValueOnce(otherGuest); // code conflict check
      await expect(
        service.update('guest-1', { invitationCode: 'TAKEN111' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('bulkCreate', () => {
    it('returns created count when all succeed', async () => {
      mockPrisma.guest.findUnique.mockResolvedValue(null);
      mockPrisma.guest.create.mockResolvedValue(mockGuest);
      const result = await service.bulkCreate({
        guests: [{ primaryName: 'Guest A' }, { primaryName: 'Guest B' }],
      });
      expect(result.created).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('skips duplicates and reports them in errors', async () => {
      mockPrisma.guest.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockGuest); // second code conflicts
      mockPrisma.guest.create
        .mockResolvedValueOnce(mockGuest)
        .mockRejectedValueOnce(new ConflictException('already in use'));
      const result = await service.bulkCreate({
        guests: [
          { primaryName: 'Guest A' },
          { primaryName: 'Guest B', invitationCode: 'TAKEN111' },
        ],
      });
      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors[0].row).toBe(2);
      expect(result.errors[0].name).toBe('Guest B');
    });
  });

  describe('remove', () => {
    it('deletes guest when found', async () => {
      mockPrisma.guest.findUnique.mockResolvedValue(mockGuest);
      mockPrisma.guest.delete.mockResolvedValue(mockGuest);
      await service.remove('guest-1');
      expect(mockPrisma.guest.delete).toHaveBeenCalledWith({ where: { id: 'guest-1' } });
    });

    it('throws NotFoundException when guest not found', async () => {
      mockPrisma.guest.findUnique.mockResolvedValue(null);
      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
