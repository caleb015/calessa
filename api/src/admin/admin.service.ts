import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RsvpStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [guests, rsvps] = await Promise.all([
      this.prisma.guest.findMany({ include: { rsvp: true } }),
      this.prisma.rsvp.findMany({ orderBy: { submittedAt: 'desc' }, take: 10, include: { guest: true } }),
    ]);

    const totalGuests = guests.length;
    const totalInvitations = guests.length;
    const confirmed = guests.filter(g => g.rsvp?.status === RsvpStatus.ATTENDING).length;
    const declined = guests.filter(g => g.rsvp?.status === RsvpStatus.DECLINED).length;
    const maybe = guests.filter(g => g.rsvp?.status === RsvpStatus.MAYBE).length;
    const pending = guests.filter(g => !g.rsvp || g.rsvp.status === RsvpStatus.PENDING).length;
    const totalHeadcount = guests
      .filter(g => g.rsvp?.status === RsvpStatus.ATTENDING)
      .reduce((sum, g) => sum + (g.rsvp?.attendeeCount ?? 0), 0);
    const plusOneCount = guests.filter(g => g.rsvp?.plusOneName).length;
    const allergyCount = guests.filter(g => g.rsvp?.dietaryRestrictions).length;
    const mealCounts = guests
      .filter(g => g.rsvp?.mealPreference)
      .reduce<Record<string, number>>((acc, g) => {
        const pref = g.rsvp!.mealPreference!;
        acc[pref] = (acc[pref] ?? 0) + 1;
        return acc;
      }, {});

    return {
      totalGuests,
      totalInvitations,
      confirmed,
      declined,
      maybe,
      pending,
      totalHeadcount,
      plusOneCount,
      allergyCount,
      mealCounts,
      recentRsvps: rsvps,
    };
  }

  async exportGuestsCsv(): Promise<string> {
    const guests = await this.prisma.guest.findMany({
      orderBy: { primaryName: 'asc' },
      include: { rsvp: true },
    });

    const headers = [
      'Name', 'Email', 'Phone', 'Group',
      'Allowed Party Size', 'Plus One Allowed', 'Requires Meal Selection',
      'Invitation Code', 'RSVP Status', 'Notes',
    ];

    const rows = guests.map(g => [
      g.primaryName,
      g.email ?? '',
      g.phone ?? '',
      g.group ?? '',
      g.allowedPartySize,
      g.plusOneAllowed ? 'Yes' : 'No',
      g.requiresMealSelection ? 'Yes' : 'No',
      g.invitationCode,
      g.rsvp?.status ?? 'PENDING',
      g.notes ?? '',
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  async exportRsvpsCsv(): Promise<string> {
    const rsvps = await this.prisma.rsvp.findMany({
      orderBy: { submittedAt: 'desc' },
      include: { guest: true },
    });

    const headers = [
      'Guest Name', 'Email', 'Phone', 'Status',
      'Attendee Count', 'Plus One Name', 'Meal Preference',
      'Dietary Restrictions', 'Message', 'Song Request', 'Submitted At',
    ];

    const rows = rsvps.map(r => [
      r.guest.primaryName,
      r.email ?? '',
      r.phone ?? '',
      r.status,
      r.attendeeCount,
      r.plusOneName ?? '',
      r.mealPreference ?? '',
      r.dietaryRestrictions ?? '',
      r.message ?? '',
      r.songRequest ?? '',
      r.submittedAt.toISOString(),
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }
}
