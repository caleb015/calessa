import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { INVITE_SELECT } from '../email/invite-template';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { BulkCreateGuestsDto } from './dto/bulk-create-guests.dto';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

@Injectable()
export class GuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  findAll() {
    return this.prisma.guest.findMany({
      orderBy: { createdAt: 'desc' },
      include: { rsvp: true },
    });
  }

  async findOne(id: string) {
    const guest = await this.prisma.guest.findUnique({
      where: { id },
      include: { rsvp: true, seatingAssignment: { include: { table: true } } },
    });
    if (!guest) throw new NotFoundException(`Guest ${id} not found`);
    return guest;
  }

  async create(dto: CreateGuestDto) {
    let code = dto.invitationCode;
    if (!code) {
      for (let attempts = 0; attempts < 10; attempts++) {
        const candidate = generateCode();
        const existing = await this.prisma.guest.findUnique({ where: { invitationCode: candidate } });
        if (!existing) { code = candidate; break; }
      }
      if (!code) throw new ConflictException('Could not generate a unique invitation code, please try again');
    } else {
      const existing = await this.prisma.guest.findUnique({ where: { invitationCode: code } });
      if (existing) throw new ConflictException(`Invitation code '${code}' is already in use`);
    }

    return this.prisma.guest.create({
      data: { ...dto, invitationCode: code },
    });
  }

  async update(id: string, dto: UpdateGuestDto) {
    await this.findOne(id);

    if (dto.invitationCode) {
      const existing = await this.prisma.guest.findUnique({ where: { invitationCode: dto.invitationCode } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Invitation code '${dto.invitationCode}' is already in use`);
      }
    }

    return this.prisma.guest.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.guest.delete({ where: { id } });
  }

  async sendInvitation(id: string): Promise<{ sent: boolean; to: string }> {
    const guest = await this.findOne(id);
    if (!guest.email) {
      throw new BadRequestException('This guest has no email address on file');
    }

    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'https://raissaandcaleb.com';
    const rsvpLink = `${frontendUrl}/rsvp/${guest.invitationCode}`;

    const settings = await this.prisma.weddingSettings.findUnique({
      where: { id: 'singleton' },
      select: {
        weddingDate: true,
        coupleNameA: true,
        coupleNameB: true,
        ...INVITE_SELECT,
      },
    });

    await this.emailService.sendInvitation({
      to: guest.email,
      guestName: guest.primaryName,
      rsvpLink,
      weddingDate: settings?.weddingDate,
      coupleNameA: settings?.coupleNameA,
      coupleNameB: settings?.coupleNameB,
      template: settings,
    });

    return { sent: true, to: guest.email };
  }

  async bulkCreate(dto: BulkCreateGuestsDto) {
    const results: { created: number; skipped: number; errors: { row: number; name: string; reason: string }[] } = {
      created: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < dto.guests.length; i++) {
      const row = plainToInstance(CreateGuestDto, dto.guests[i]);
      const name = typeof row.primaryName === 'string' ? row.primaryName : '';
      try {
        const problems = await validate(row, { whitelist: true, forbidNonWhitelisted: true });
        if (problems.length) {
          throw new BadRequestException(problems.flatMap(p => Object.values(p.constraints ?? {})).join('; '));
        }
        await this.create(row);
        results.created++;
      } catch (err: any) {
        results.skipped++;
        results.errors.push({ row: i + 1, name, reason: err?.message ?? 'Unknown error' });
      }
    }

    return results;
  }
}
