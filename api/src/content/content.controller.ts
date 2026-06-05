import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContentService } from './content.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { CreateScheduleItemDto, UpdateScheduleItemDto } from './dto/schedule.dto';
import { CreateFaqItemDto, UpdateFaqItemDto } from './dto/faq.dto';
import { CreateGalleryImageDto, UpdateGalleryImageDto } from './dto/gallery.dto';
import { CreateStoryTimelineItemDto, UpdateStoryTimelineItemDto } from './dto/story.dto';
import { CreateContactPersonDto, UpdateContactPersonDto } from './dto/contact.dto';

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class ContentController {
  constructor(private readonly service: ContentService) {}

  // ── Events ─────────────────────────────────────────────────────────────────

  @Get('events') findAllEvents() { return this.service.findAllEvents(); }
  @Get('events/:id') findOneEvent(@Param('id') id: string) { return this.service.findOneEvent(id); }
  @Post('events') createEvent(@Body() dto: CreateEventDto) { return this.service.createEvent(dto); }
  @Patch('events/:id') updateEvent(@Param('id') id: string, @Body() dto: UpdateEventDto) { return this.service.updateEvent(id, dto); }
  @Delete('events/:id') @HttpCode(HttpStatus.NO_CONTENT) removeEvent(@Param('id') id: string) { return this.service.removeEvent(id); }

  // ── Schedule ───────────────────────────────────────────────────────────────

  @Get('schedule') findAllSchedule() { return this.service.findAllSchedule(); }
  @Get('schedule/:id') findOneSchedule(@Param('id') id: string) { return this.service.findOneSchedule(id); }
  @Post('schedule') createSchedule(@Body() dto: CreateScheduleItemDto) { return this.service.createScheduleItem(dto); }
  @Patch('schedule/:id') updateSchedule(@Param('id') id: string, @Body() dto: UpdateScheduleItemDto) { return this.service.updateScheduleItem(id, dto); }
  @Delete('schedule/:id') @HttpCode(HttpStatus.NO_CONTENT) removeSchedule(@Param('id') id: string) { return this.service.removeScheduleItem(id); }

  // ── FAQ ────────────────────────────────────────────────────────────────────

  @Get('faqs') findAllFaqs() { return this.service.findAllFaqs(); }
  @Get('faqs/:id') findOneFaq(@Param('id') id: string) { return this.service.findOneFaq(id); }
  @Post('faqs') createFaq(@Body() dto: CreateFaqItemDto) { return this.service.createFaq(dto); }
  @Patch('faqs/:id') updateFaq(@Param('id') id: string, @Body() dto: UpdateFaqItemDto) { return this.service.updateFaq(id, dto); }
  @Delete('faqs/:id') @HttpCode(HttpStatus.NO_CONTENT) removeFaq(@Param('id') id: string) { return this.service.removeFaq(id); }

  // ── Gallery ────────────────────────────────────────────────────────────────

  @Get('gallery') findAllGallery() { return this.service.findAllGallery(); }
  @Get('gallery/:id') findOneGallery(@Param('id') id: string) { return this.service.findOneGalleryImage(id); }
  @Post('gallery') createGallery(@Body() dto: CreateGalleryImageDto) { return this.service.createGalleryImage(dto); }
  @Patch('gallery/:id') updateGallery(@Param('id') id: string, @Body() dto: UpdateGalleryImageDto) { return this.service.updateGalleryImage(id, dto); }
  @Delete('gallery/:id') @HttpCode(HttpStatus.NO_CONTENT) removeGallery(@Param('id') id: string) { return this.service.removeGalleryImage(id); }

  // ── Story Timeline ─────────────────────────────────────────────────────────

  @Get('story-timeline') findAllStory() { return this.service.findAllStory(); }
  @Get('story-timeline/:id') findOneStory(@Param('id') id: string) { return this.service.findOneStoryItem(id); }
  @Post('story-timeline') createStory(@Body() dto: CreateStoryTimelineItemDto) { return this.service.createStoryItem(dto); }
  @Patch('story-timeline/:id') updateStory(@Param('id') id: string, @Body() dto: UpdateStoryTimelineItemDto) { return this.service.updateStoryItem(id, dto); }
  @Delete('story-timeline/:id') @HttpCode(HttpStatus.NO_CONTENT) removeStory(@Param('id') id: string) { return this.service.removeStoryItem(id); }

  // ── Contact ────────────────────────────────────────────────────────────────

  @Get('contact') findAllContact() { return this.service.findAllContact(); }
  @Get('contact/:id') findOneContact(@Param('id') id: string) { return this.service.findOneContact(id); }
  @Post('contact') createContact(@Body() dto: CreateContactPersonDto) { return this.service.createContact(dto); }
  @Patch('contact/:id') updateContact(@Param('id') id: string, @Body() dto: UpdateContactPersonDto) { return this.service.updateContact(id, dto); }
  @Delete('contact/:id') @HttpCode(HttpStatus.NO_CONTENT) removeContact(@Param('id') id: string) { return this.service.removeContact(id); }
}
