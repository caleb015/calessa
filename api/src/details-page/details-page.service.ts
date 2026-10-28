import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDetailsPageDto } from './dto/details-page.dto';
import { DETAILS_PAGE_DEFAULTS, DETAILS_PAGE_TEXT_FIELDS } from './details-page.defaults';
import { buildCalendarInfo, renderIcs } from './calendar';
import { DressCodeService } from './dress-code.service';

const SINGLETON_ID = 'singleton';

@Injectable()
export class DetailsPageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly dressCode: DressCodeService,
  ) {}

  private get frontendUrl() {
    return this.config.get<string>('FRONTEND_URL') ?? 'https://raissaandcaleb.com';
  }

  private async assertSitePublic(preview = false) {
    if (preview) return;
    const settings = await this.prisma.weddingSettings.findUnique({ where: { id: SINGLETON_ID }, select: { isPublic: true } });
    if (settings && !settings.isPublic) {
      throw new ServiceUnavailableException('The website is not currently available');
    }
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  /** Saved values ('' = use default) plus the defaults. Reading never creates the row. */
  async getForAdmin() {
    const row = await this.prisma.detailsPage.findUnique({ where: { id: SINGLETON_ID } });
    const page = {
      ...Object.fromEntries(DETAILS_PAGE_TEXT_FIELDS.map(f => [f, row?.[f] ?? ''])),
      showAddToCalendar: row?.showAddToCalendar ?? true,
      ctaEnabled: row?.ctaEnabled ?? true,
    };
    return { page, defaults: DETAILS_PAGE_DEFAULTS };
  }

  async update(dto: UpdateDetailsPageDto) {
    await this.prisma.detailsPage.upsert({
      where: { id: SINGLETON_ID },
      update: dto,
      create: { id: SINGLETON_ID, ...dto },
    });
    return this.getForAdmin();
  }

  // ── Public ─────────────────────────────────────────────────────────────────

  private async calendarInfo(location: string | null) {
    const [events, settings] = await Promise.all([
      this.prisma.weddingEvent.findMany({ select: { startTime: true, endTime: true, venueName: true }, orderBy: { displayOrder: 'asc' } }),
      this.prisma.weddingSettings.findUnique({ where: { id: SINGLETON_ID }, select: { weddingDate: true, coupleNameA: true, coupleNameB: true } }),
    ]);
    return buildCalendarInfo({
      events,
      weddingDate: settings?.weddingDate ?? null,
      coupleNameA: settings?.coupleNameA || 'Caleb',
      coupleNameB: settings?.coupleNameB || 'Raissa',
      location,
      detailsUrl: `${this.frontendUrl}/details`,
    });
  }

  async getPublic(preview = false) {
    await this.assertSitePublic(preview);
    const row = await this.prisma.detailsPage.findUnique({ where: { id: SINGLETON_ID } });
    const text = (field: keyof typeof DETAILS_PAGE_DEFAULTS) => row?.[field] || DETAILS_PAGE_DEFAULTS[field];
    const location = row?.location || null;
    const showAddToCalendar = row?.showAddToCalendar ?? true;

    return {
      header: { eyebrow: text('headerEyebrow'), title: text('headerTitle'), location },
      calendar: showAddToCalendar ? await this.calendarInfo(location) : null,
      cta: (row?.ctaEnabled ?? true)
        ? { heading: text('ctaHeading'), subtext: text('ctaSubtext'), buttonLabel: text('ctaButtonLabel') }
        : null,
      dressCode: await this.dressCode.getPublic(),
    };
  }

  async getIcs(): Promise<string> {
    await this.assertSitePublic();
    const row = await this.prisma.detailsPage.findUnique({ where: { id: SINGLETON_ID }, select: { location: true } });
    const info = await this.calendarInfo(row?.location || null);
    if (!info) throw new NotFoundException('No wedding date or event times are set yet');
    return renderIcs(info, new URL(this.frontendUrl).hostname);
  }
}
