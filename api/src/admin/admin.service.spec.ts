import { Test, TestingModule } from '@nestjs/testing';
import { RsvpStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

const makeGuest = (overrides: any = {}) => ({
  id: 'g1',
  primaryName: 'Juan',
  email: 'juan@example.com',
  phone: null,
  group: 'Family',
  allowedPartySize: 2,
  plusOneAllowed: true,
  requiresMealSelection: false,
  invitationCode: 'CODE0001',
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  rsvp: null,
  ...overrides,
});

const makeRsvp = (overrides: any = {}) => ({
  id: 'r1',
  guestId: 'g1',
  status: RsvpStatus.ATTENDING,
  attendeeCount: 2,
  email: 'juan@example.com',
  phone: null,
  plusOneName: 'Jane',
  mealPreference: 'Chicken',
  dietaryRestrictions: null,
  message: null,
  songRequest: null,
  submittedAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const mockPrisma = {
  guest: { findMany: jest.fn() },
  rsvp: { findMany: jest.fn() },
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    it('returns correct counts', async () => {
      const guests = [
        makeGuest({ id: 'g1', invitationCode: 'C1', rsvp: makeRsvp({ status: RsvpStatus.ATTENDING, attendeeCount: 2 }) }),
        makeGuest({ id: 'g2', invitationCode: 'C2', rsvp: makeRsvp({ id: 'r2', guestId: 'g2', status: RsvpStatus.DECLINED, attendeeCount: 0, plusOneName: null, mealPreference: null }) }),
        makeGuest({ id: 'g3', invitationCode: 'C3', rsvp: null }),
      ];
      mockPrisma.guest.findMany.mockResolvedValue(guests);
      mockPrisma.rsvp.findMany.mockResolvedValue([]);

      const result = await service.getSummary();

      expect(result.totalGuests).toBe(3);
      expect(result.confirmed).toBe(1);
      expect(result.declined).toBe(1);
      expect(result.pending).toBe(1);
      expect(result.totalHeadcount).toBe(2);
      expect(result.plusOneCount).toBe(1);
      expect(result.mealCounts).toEqual({ Chicken: 1 });
    });
  });

  describe('exportGuestsCsv', () => {
    it('returns CSV with headers and guest rows', async () => {
      mockPrisma.guest.findMany.mockResolvedValue([
        makeGuest({ rsvp: makeRsvp() }),
      ]);
      const csv = await service.exportGuestsCsv();
      expect(csv).toContain('Name');
      expect(csv).toContain('Invitation Code');
      expect(csv).toContain('Juan');
      expect(csv).toContain('CODE0001');
    });

    it('escapes double quotes in CSV values', async () => {
      mockPrisma.guest.findMany.mockResolvedValue([
        makeGuest({ primaryName: 'O\'Brien, "The" Guest', rsvp: null }),
      ]);
      const csv = await service.exportGuestsCsv();
      expect(csv).toContain('""The""');
    });
  });

  describe('exportRsvpsCsv', () => {
    it('returns CSV with headers and RSVP rows', async () => {
      mockPrisma.rsvp.findMany.mockResolvedValue([
        { ...makeRsvp(), guest: makeGuest() },
      ]);
      const csv = await service.exportRsvpsCsv();
      expect(csv).toContain('Guest Name');
      expect(csv).toContain('Juan');
      expect(csv).toContain('ATTENDING');
      expect(csv).toContain('Chicken');
    });

    it('returns only headers when no RSVPs exist', async () => {
      mockPrisma.rsvp.findMany.mockResolvedValue([]);
      const csv = await service.exportRsvpsCsv();
      const lines = csv.split('\n');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('Guest Name');
    });
  });

  describe('exportGuestsCsv with no guests', () => {
    it('returns only headers when no guests exist', async () => {
      mockPrisma.guest.findMany.mockResolvedValue([]);
      const csv = await service.exportGuestsCsv();
      const lines = csv.split('\n');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('Name');
    });
  });

  describe('getSummary with no data', () => {
    it('returns all zeros when no guests exist', async () => {
      mockPrisma.guest.findMany.mockResolvedValue([]);
      mockPrisma.rsvp.findMany.mockResolvedValue([]);
      const result = await service.getSummary();
      expect(result.totalGuests).toBe(0);
      expect(result.confirmed).toBe(0);
      expect(result.totalHeadcount).toBe(0);
      expect(result.mealCounts).toEqual({});
      expect(result.recentRsvps).toHaveLength(0);
    });
  });
});
