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

// Minimal RFC 4180 parser (handles quoted commas and quoted newlines) so CSV
// correctness tests verify actual row/column structure, not just substrings.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cell += ch; }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell); cell = '';
    } else if (ch === '\n') {
      row.push(cell); cell = ''; rows.push(row); row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

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

    it('keeps a comma inside a value from creating extra columns', async () => {
      mockPrisma.guest.findMany.mockResolvedValue([
        makeGuest({ primaryName: 'Smith, John', group: 'Family, Maternal', rsvp: null }),
      ]);
      const csv = await service.exportGuestsCsv();
      const [headerRow, dataRow] = parseCsv(csv);
      expect(dataRow).toHaveLength(headerRow.length);
      expect(dataRow[0]).toBe('Smith, John');
      expect(dataRow[3]).toBe('Family, Maternal');
    });

    it('keeps an embedded newline inside a value from splitting into an extra row', async () => {
      mockPrisma.guest.findMany.mockResolvedValue([
        makeGuest({ notes: 'Allergic to nuts.\nNeeds wheelchair access.', rsvp: null }),
        makeGuest({ id: 'g2', invitationCode: 'CODE0002', primaryName: 'Second Guest', rsvp: null }),
      ]);
      const csv = await service.exportGuestsCsv();
      const rows = parseCsv(csv);
      expect(rows).toHaveLength(3); // header + 2 guests, despite the embedded newline
      expect(rows[1][rows[0].indexOf('Notes')]).toBe('Allergic to nuts.\nNeeds wheelchair access.');
      expect(rows[2][0]).toBe('Second Guest');
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

    it('keeps a comma and embedded newline inside the message field from corrupting rows/columns', async () => {
      mockPrisma.rsvp.findMany.mockResolvedValue([
        { ...makeRsvp(), message: 'Congrats, can\'t wait!\nSee you there.', guest: makeGuest() },
        { ...makeRsvp(), id: 'r2', guest: makeGuest({ id: 'g2', primaryName: 'Second Guest' }) },
      ]);
      const csv = await service.exportRsvpsCsv();
      const rows = parseCsv(csv);
      expect(rows).toHaveLength(3); // header + 2 RSVPs
      expect(rows[0]).toHaveLength(rows[1].length);
      expect(rows[1][rows[0].indexOf('Message')]).toBe('Congrats, can\'t wait!\nSee you there.');
      expect(rows[2][0]).toBe('Second Guest');
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
