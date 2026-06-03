import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateWeddingSettingsDto } from './dto/update-wedding-settings.dto';

const SINGLETON_ID = 'singleton';

@Injectable()
export class WeddingSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  get() {
    return this.prisma.weddingSettings.upsert({
      where: { id: SINGLETON_ID },
      update: {},
      create: { id: SINGLETON_ID },
    });
  }

  update(dto: UpdateWeddingSettingsDto) {
    const data: Record<string, unknown> = { ...dto };
    if (dto.weddingDate) data.weddingDate = new Date(dto.weddingDate);
    if (dto.rsvpDeadline) data.rsvpDeadline = new Date(dto.rsvpDeadline);
    return this.prisma.weddingSettings.upsert({
      where: { id: SINGLETON_ID },
      update: data,
      create: { id: SINGLETON_ID, ...data },
    });
  }
}
