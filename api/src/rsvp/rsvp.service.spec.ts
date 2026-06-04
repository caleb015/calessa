import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { RsvpStatus } from '@prisma/client';
import { RsvpService } from './rsvp.service';
import { PrismaService } from '../prisma/prisma.service';

const mockGuest = {
  id: 'guest-1',
  primaryName: 'Juan dela Cruz',
  allowedPartySize: 2,
  plusOneAllowed: true,
  invitationCode: 'TESTCODE',
  rsvp: null,
};

const mockRsvp = {
  id: 'rsvp-1',
  guestId: 'guest-1',
  status: RsvpStatus.ATTENDING,
  attendeeCount: 2,
  email: 'juan@example.com',
  phone: null,
  plusOneName: 'Jane',
  mealPreference: null,
  dietaryRestrictions: null,
  message: null,
  songRequest: null,
  submittedAt: new Date(),
  updatedAt: new Date(),
};

const mockSettings = {
  id: 'singleton',
  isRsvpEnabled: true,
  allowMaybe: false,
  rsvpDeadline: null,
};

const mockPrisma = {
  guest: { findUnique: jest.fn() },
  rsvp: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn(), delete: jest.fn() },
  weddingSettings: { findUnique: jest.fn() },
};

describe('RsvpService', () => {
  let service: RsvpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RsvpService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RsvpService>(RsvpService);
    jest.clearAllMocks();
  });

  // ── getByCode ──────────────────────────────────────────────────────────────

  describe('getByCode', () => {
    it('returns limited guest data for a valid code', async () => {
      mockPrisma.guest.findUnique.mockResolvedValue(mockGuest);
      const result = await service.getByCode('TESTCODE');
      expect(result).toEqual(mockGuest);
    });

    it('throws NotFoundException for an invalid code', async () => {
      mockPrisma.guest.findUnique.mockResolvedValue(null);
      await expect(service.getByCode('BADCODE')).rejects.toThrow(NotFoundException);
    });
  });

  // ── submitByCode ───────────────────────────────────────────────────────────

  describe('submitByCode', () => {
    const validDto = {
      status: RsvpStatus.ATTENDING,
      attendeeCount: 1,
      email: 'juan@example.com',
    };

    beforeEach(() => {
      mockPrisma.guest.findUnique.mockResolvedValue({ ...mockGuest, rsvp: null });
      mockPrisma.weddingSettings.findUnique.mockResolvedValue(mockSettings);
      mockPrisma.rsvp.upsert.mockResolvedValue(mockRsvp);
    });

    it('creates an RSVP for a valid submission', async () => {
      const result = await service.submitByCode('TESTCODE', validDto);
      expect(mockPrisma.rsvp.upsert).toHaveBeenCalled();
      expect(result).toEqual(mockRsvp);
    });

    it('throws NotFoundException for invalid code', async () => {
      mockPrisma.guest.findUnique.mockResolvedValue(null);
      await expect(service.submitByCode('BADCODE', validDto)).rejects.toThrow(NotFoundException);
    });

    it('throws UnprocessableEntityException when RSVPs are disabled', async () => {
      mockPrisma.weddingSettings.findUnique.mockResolvedValue({ ...mockSettings, isRsvpEnabled: false });
      await expect(service.submitByCode('TESTCODE', validDto)).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException when deadline has passed', async () => {
      const pastDate = new Date(Date.now() - 1000);
      mockPrisma.weddingSettings.findUnique.mockResolvedValue({ ...mockSettings, rsvpDeadline: pastDate });
      await expect(service.submitByCode('TESTCODE', validDto)).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws BadRequestException when MAYBE is submitted but not allowed', async () => {
      await expect(
        service.submitByCode('TESTCODE', { ...validDto, status: RsvpStatus.MAYBE }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows MAYBE when allowMaybe is enabled', async () => {
      mockPrisma.weddingSettings.findUnique.mockResolvedValue({ ...mockSettings, allowMaybe: true });
      await service.submitByCode('TESTCODE', { ...validDto, status: RsvpStatus.MAYBE });
      expect(mockPrisma.rsvp.upsert).toHaveBeenCalled();
    });

    it('throws BadRequestException when attendeeCount exceeds allowedPartySize', async () => {
      await expect(
        service.submitByCode('TESTCODE', { ...validDto, attendeeCount: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when plusOneName provided but not allowed', async () => {
      mockPrisma.guest.findUnique.mockResolvedValue({ ...mockGuest, plusOneAllowed: false, rsvp: null });
      await expect(
        service.submitByCode('TESTCODE', { ...validDto, plusOneName: 'Jane' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when ATTENDING with attendeeCount of 0', async () => {
      await expect(
        service.submitByCode('TESTCODE', { ...validDto, status: RsvpStatus.ATTENDING, attendeeCount: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows attendeeCount of 0 when DECLINED', async () => {
      await service.submitByCode('TESTCODE', { ...validDto, status: RsvpStatus.DECLINED, attendeeCount: 0 });
      expect(mockPrisma.rsvp.upsert).toHaveBeenCalled();
    });

    it('allows RSVP submission when no WeddingSettings exist', async () => {
      mockPrisma.weddingSettings.findUnique.mockResolvedValue(null);
      await service.submitByCode('TESTCODE', validDto);
      expect(mockPrisma.rsvp.upsert).toHaveBeenCalled();
    });

    it('does not throw when deadline is in the future', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      mockPrisma.weddingSettings.findUnique.mockResolvedValue({ ...mockSettings, rsvpDeadline: futureDate });
      await service.submitByCode('TESTCODE', validDto);
      expect(mockPrisma.rsvp.upsert).toHaveBeenCalled();
    });
  });

  // ── admin findAll / findOne ────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all RSVPs with guest included', async () => {
      mockPrisma.rsvp.findMany.mockResolvedValue([mockRsvp]);
      const result = await service.findAll();
      expect(result).toEqual([mockRsvp]);
    });
  });

  describe('findOne', () => {
    it('returns RSVP when found', async () => {
      mockPrisma.rsvp.findUnique.mockResolvedValue(mockRsvp);
      const result = await service.findOne('rsvp-1');
      expect(result).toEqual(mockRsvp);
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.rsvp.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── admin update / remove ──────────────────────────────────────────────────

  describe('update', () => {
    it('updates RSVP fields', async () => {
      mockPrisma.rsvp.findUnique.mockResolvedValue(mockRsvp);
      mockPrisma.rsvp.update.mockResolvedValue({ ...mockRsvp, status: RsvpStatus.DECLINED });
      const result = await service.update('rsvp-1', { status: RsvpStatus.DECLINED });
      expect(result.status).toBe(RsvpStatus.DECLINED);
    });

    it('throws NotFoundException when RSVP not found', async () => {
      mockPrisma.rsvp.findUnique.mockResolvedValue(null);
      await expect(service.update('bad-id', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes RSVP when found', async () => {
      mockPrisma.rsvp.findUnique.mockResolvedValue(mockRsvp);
      mockPrisma.rsvp.delete.mockResolvedValue(mockRsvp);
      await service.remove('rsvp-1');
      expect(mockPrisma.rsvp.delete).toHaveBeenCalledWith({ where: { id: 'rsvp-1' } });
    });

    it('throws NotFoundException when RSVP not found', async () => {
      mockPrisma.rsvp.findUnique.mockResolvedValue(null);
      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
