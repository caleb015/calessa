import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { InviteEmailDto } from './dto/invite-email.dto';
import {
  INVITE_DEFAULTS,
  INVITE_FIELDS,
  INVITE_PLACEHOLDERS,
  INVITE_SELECT,
  InviteField,
  InviteOverrides,
  renderInvitation,
} from './invite-template';

const SINGLETON_ID = 'singleton';

export const PREVIEW_GUEST_NAME = 'Juan dela Cruz';
export const PREVIEW_CODE = 'SAMPLE01';

@Injectable()
export class InviteEmailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async get() {
    const settings = await this.prisma.weddingSettings.findUnique({
      where: { id: SINGLETON_ID },
      select: INVITE_SELECT,
    });
    const template = Object.fromEntries(INVITE_FIELDS.map(f => [f, settings?.[f] ?? ''])) as Record<InviteField, string>;
    return { template, defaults: INVITE_DEFAULTS, placeholders: INVITE_PLACEHOLDERS };
  }

  async update(dto: InviteEmailDto) {
    await this.prisma.weddingSettings.upsert({
      where: { id: SINGLETON_ID },
      update: dto,
      create: { id: SINGLETON_ID, ...dto },
    });
    return this.get();
  }

  /** Renders unsaved edits on top of what's saved, with a sample guest and the real couple/date. */
  async preview(draft: InviteEmailDto) {
    const settings = await this.prisma.weddingSettings.findUnique({
      where: { id: SINGLETON_ID },
      select: { ...INVITE_SELECT, weddingDate: true, coupleNameA: true, coupleNameB: true },
    });
    // DTO instances carry every declared field (undefined when not sent); only real edits should override.
    const edits = Object.fromEntries(Object.entries(draft).filter(([, v]) => v !== undefined));
    const overrides: InviteOverrides = { ...settings, ...edits };
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'https://raissaandcaleb.com';
    return renderInvitation(overrides, {
      guestName: PREVIEW_GUEST_NAME,
      rsvpLink: `${frontendUrl}/rsvp/${PREVIEW_CODE}`,
      weddingDate: settings?.weddingDate,
      coupleNameA: settings?.coupleNameA,
      coupleNameB: settings?.coupleNameB,
    });
  }
}
