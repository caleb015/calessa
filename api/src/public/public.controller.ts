import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PreviewGuard, SitePreview } from '../preview/preview.guard';
import { GalleryPageQueryDto } from './dto/gallery-page.dto';
import { HomepageGalleryQueryDto } from './dto/homepage-gallery.dto';
import { PublicService } from './public.service';

@Controller('public')
@UseGuards(PreviewGuard)
export class PublicController {
  constructor(private readonly service: PublicService) {}

  // `preview` tells the site to render normally (with a preview banner) instead of the maintenance page.
  @Get('settings')
  async getSettings(@SitePreview() preview: boolean) {
    const settings = await this.service.getSettings();
    return settings && { ...settings, preview };
  }

  @Get('story')
  getStory(@SitePreview() preview: boolean) {
    return this.service.getStory(preview);
  }

  @Get('events')
  getEvents(@SitePreview() preview: boolean) {
    return this.service.getEvents(preview);
  }

  @Get('schedule')
  getSchedule(@SitePreview() preview: boolean) {
    return this.service.getSchedule(preview);
  }

  @Get('faqs')
  getFaqs(@SitePreview() preview: boolean) {
    return this.service.getFaqs(preview);
  }

  @Get('gallery')
  getGallery(@SitePreview() preview: boolean) {
    return this.service.getGallery(preview);
  }

  @Get('gallery/homepage')
  getHomepageGallery(@SitePreview() preview: boolean, @Query() query: HomepageGalleryQueryDto) {
    return this.service.getHomepageGallery(preview, query.offset, query.limit, query.seed);
  }

  @Get('gallery/page')
  getGalleryPage(@SitePreview() preview: boolean, @Query() query: GalleryPageQueryDto) {
    return this.service.getGalleryPage(preview, query.offset, query.limit);
  }

  @Get('contact')
  getContact(@SitePreview() preview: boolean) {
    return this.service.getContact(preview);
  }
}
