import { Body, Controller, Get, Header, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PreviewGuard, SitePreview } from '../preview/preview.guard';
import { UpdateDetailsPageDto } from './dto/details-page.dto';
import { DetailsPageService } from './details-page.service';

@Controller('admin/details-page')
@UseGuards(JwtAuthGuard)
export class DetailsPageAdminController {
  constructor(private readonly service: DetailsPageService) {}

  @Get()
  get() {
    return this.service.getForAdmin();
  }

  @Patch()
  update(@Body() dto: UpdateDetailsPageDto) {
    return this.service.update(dto);
  }
}

@Controller('public')
@UseGuards(PreviewGuard)
export class DetailsPagePublicController {
  constructor(private readonly service: DetailsPageService) {}

  @Get('details-page')
  get(@SitePreview() preview: boolean) {
    return this.service.getPublic(preview);
  }

  @Get('calendar.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="wedding.ics"')
  ics() {
    return this.service.getIcs();
  }
}
