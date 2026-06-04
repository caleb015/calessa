import { Controller, Get } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly service: PublicService) {}

  @Get('settings')
  getSettings() {
    return this.service.getSettings();
  }

  @Get('story')
  getStory() {
    return this.service.getStory();
  }

  @Get('events')
  getEvents() {
    return this.service.getEvents();
  }

  @Get('schedule')
  getSchedule() {
    return this.service.getSchedule();
  }

  @Get('faqs')
  getFaqs() {
    return this.service.getFaqs();
  }

  @Get('gallery')
  getGallery() {
    return this.service.getGallery();
  }

  @Get('contact')
  getContact() {
    return this.service.getContact();
  }
}
