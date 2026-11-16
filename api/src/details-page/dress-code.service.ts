import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDressCodeGuidelineDto, UpdateDressCodeDto, UpdateDressCodeGuidelineDto } from './dto/dress-code.dto';

const SINGLETON_ID = 'singleton';
const GUIDELINE_ORDER = [{ displayOrder: 'asc' as const }, { createdAt: 'asc' as const }];

@Injectable()
export class DressCodeService {
  constructor(private readonly prisma: PrismaService) {}

  /** Saved settings ('' for blank text). Reading never creates the row. */
  async getSettings() {
    const row = await this.prisma.dressCode.findUnique({ where: { id: SINGLETON_ID } });
    return {
      enabled: row?.enabled ?? false,
      eyebrow: row?.eyebrow ?? '',
      title: row?.title ?? '',
      intro: row?.intro ?? '',
      palette: row?.palette ?? [],
      imageUrls: row?.imageUrls ?? [],
    };
  }

  async updateSettings(dto: UpdateDressCodeDto) {
    await this.prisma.dressCode.upsert({
      where: { id: SINGLETON_ID },
      update: dto,
      create: { id: SINGLETON_ID, ...dto },
    });
    return this.getSettings();
  }

  findAllGuidelines() {
    return this.prisma.dressCodeGuideline.findMany({ orderBy: GUIDELINE_ORDER });
  }

  async findOneGuideline(id: string) {
    const item = await this.prisma.dressCodeGuideline.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Guideline ${id} not found`);
    return item;
  }

  createGuideline(dto: CreateDressCodeGuidelineDto) {
    return this.prisma.dressCodeGuideline.create({ data: dto });
  }

  async updateGuideline(id: string, dto: UpdateDressCodeGuidelineDto) {
    await this.findOneGuideline(id);
    return this.prisma.dressCodeGuideline.update({ where: { id }, data: dto });
  }

  async removeGuideline(id: string) {
    await this.findOneGuideline(id);
    return this.prisma.dressCodeGuideline.delete({ where: { id } });
  }

  /** What the public page shows: null when switched off or there is nothing to show. */
  async getPublic() {
    const [settings, guidelines] = await Promise.all([
      this.prisma.dressCode.findUnique({ where: { id: SINGLETON_ID } }),
      this.prisma.dressCodeGuideline.findMany({ orderBy: GUIDELINE_ORDER, select: { id: true, label: true, text: true, note: true, imageUrls: true } }),
    ]);
    if (!settings?.enabled) return null;
    const hasContent = settings.title || settings.intro || settings.eyebrow || settings.palette.length > 0
      || settings.imageUrls.length > 0 || guidelines.length > 0;
    if (!hasContent) return null;
    return {
      eyebrow: settings.eyebrow || null,
      title: settings.title || null,
      intro: settings.intro || null,
      palette: settings.palette,
      imageUrls: settings.imageUrls,
      guidelines,
    };
  }
}
