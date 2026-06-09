import { ConflictException, Injectable } from '@nestjs/common';
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

  async update(dto: UpdateWeddingSettingsDto) {
    const current = await this.get();

    if (dto.requireUniqueTableNumbers && !current.requireUniqueTableNumbers) {
      await this.assertNoDuplicateTableNumbers();
    }
    if (dto.requireUniqueTableNames && !current.requireUniqueTableNames) {
      await this.assertNoDuplicateTableNames();
    }

    const data: Record<string, unknown> = { ...dto };
    if (dto.weddingDate) data.weddingDate = new Date(dto.weddingDate);
    if (dto.rsvpDeadline) data.rsvpDeadline = new Date(dto.rsvpDeadline);
    return this.prisma.weddingSettings.upsert({
      where: { id: SINGLETON_ID },
      update: data,
      create: { id: SINGLETON_ID, ...data },
    });
  }

  private async assertNoDuplicateTableNumbers() {
    const groups = await this.prisma.seatingTable.groupBy({
      by: ['tableNumber'],
      where: { tableNumber: { not: null } },
      _count: { _all: true },
    });
    const dupes = groups.filter((g) => g._count._all > 1);
    if (dupes.length > 0) {
      const list = dupes.map((g) => `#${g.tableNumber}`).join(', ');
      throw new ConflictException(
        `A few tables are sharing the same number (${list}) — sort those out below first, then flip this back on.`,
      );
    }
  }

  private async assertNoDuplicateTableNames() {
    const groups = await this.prisma.seatingTable.groupBy({
      by: ['name'],
      where: { name: { not: null } },
      _count: { _all: true },
    });
    const dupes = groups.filter((g) => g._count._all > 1);
    if (dupes.length > 0) {
      const list = dupes.map((g) => `"${g.name}"`).join(', ');
      throw new ConflictException(
        `A few tables are sharing the same name (${list}) — sort those out below first, then flip this back on.`,
      );
    }
  }
}
