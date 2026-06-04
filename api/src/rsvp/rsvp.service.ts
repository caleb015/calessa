import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitRsvpDto } from './dto/submit-rsvp.dto';
import { AdminUpdateRsvpDto } from './dto/admin-update-rsvp.dto';
import { RsvpStatus } from '@prisma/client';

const SINGLETON_SETTINGS_ID = 'singleton';

@Injectable()
export class RsvpService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Public ─────────────────────────────────────────────────────────────────

  async getByCode(code: string) {
    const guest = await this.prisma.guest.findUnique({
      where: { invitationCode: code },
      select: {
        id: true,
        primaryName: true,
        allowedPartySize: true,
        plusOneAllowed: true,
        rsvp: true,
      },
    });
    if (!guest) throw new NotFoundException('Invitation code not found');
    return guest;
  }

  async submitByCode(code: string, dto: SubmitRsvpDto) {
    const guest = await this.prisma.guest.findUnique({
      where: { invitationCode: code },
      include: { rsvp: true },
    });
    if (!guest) throw new NotFoundException('Invitation code not found');

    const settings = await this.prisma.weddingSettings.findUnique({
      where: { id: SINGLETON_SETTINGS_ID },
    });

    if (settings && !settings.isRsvpEnabled) {
      throw new UnprocessableEntityException('RSVPs are currently closed');
    }

    if (settings?.rsvpDeadline && new Date() > settings.rsvpDeadline) {
      throw new UnprocessableEntityException('The RSVP deadline has passed');
    }

    if (dto.status === RsvpStatus.MAYBE && settings && !settings.allowMaybe) {
      throw new BadRequestException('"Maybe" is not an accepted RSVP response');
    }

    if (
      (dto.status === RsvpStatus.ATTENDING || dto.status === RsvpStatus.MAYBE) &&
      dto.attendeeCount < 1
    ) {
      throw new BadRequestException('Attendee count must be at least 1 when attending');
    }

    if (dto.attendeeCount > guest.allowedPartySize) {
      throw new BadRequestException(
        `Attendee count cannot exceed the allowed party size of ${guest.allowedPartySize}`,
      );
    }

    if (dto.plusOneName && !guest.plusOneAllowed) {
      throw new BadRequestException('A plus-one is not allowed for this invitation');
    }

    return this.prisma.rsvp.upsert({
      where: { guestId: guest.id },
      update: { ...dto, updatedAt: new Date() },
      create: { guestId: guest.id, ...dto },
    });
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  findAll() {
    return this.prisma.rsvp.findMany({
      orderBy: { submittedAt: 'desc' },
      include: { guest: true },
    });
  }

  async findOne(id: string) {
    const rsvp = await this.prisma.rsvp.findUnique({
      where: { id },
      include: { guest: true },
    });
    if (!rsvp) throw new NotFoundException(`RSVP ${id} not found`);
    return rsvp;
  }

  async update(id: string, dto: AdminUpdateRsvpDto) {
    await this.findOne(id);
    return this.prisma.rsvp.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.rsvp.delete({ where: { id } });
  }
}
