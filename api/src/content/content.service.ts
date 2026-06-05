import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { CreateScheduleItemDto, UpdateScheduleItemDto } from './dto/schedule.dto';
import { CreateFaqItemDto, UpdateFaqItemDto } from './dto/faq.dto';
import { CreateGalleryImageDto, UpdateGalleryImageDto } from './dto/gallery.dto';
import { CreateStoryTimelineItemDto, UpdateStoryTimelineItemDto } from './dto/story.dto';
import { CreateContactPersonDto, UpdateContactPersonDto } from './dto/contact.dto';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Events ─────────────────────────────────────────────────────────────────

  findAllEvents() {
    return this.prisma.weddingEvent.findMany({ orderBy: { displayOrder: 'asc' } });
  }

  async findOneEvent(id: string) {
    const item = await this.prisma.weddingEvent.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Event ${id} not found`);
    return item;
  }

  createEvent(dto: CreateEventDto) {
    const data: any = { ...dto };
    if (dto.startTime) data.startTime = new Date(dto.startTime);
    if (dto.endTime) data.endTime = new Date(dto.endTime);
    return this.prisma.weddingEvent.create({ data });
  }

  async updateEvent(id: string, dto: UpdateEventDto) {
    await this.findOneEvent(id);
    const data: any = { ...dto };
    if (dto.startTime) data.startTime = new Date(dto.startTime);
    if (dto.endTime) data.endTime = new Date(dto.endTime);
    return this.prisma.weddingEvent.update({ where: { id }, data });
  }

  async removeEvent(id: string) {
    await this.findOneEvent(id);
    return this.prisma.weddingEvent.delete({ where: { id } });
  }

  // ── Schedule ───────────────────────────────────────────────────────────────

  findAllSchedule() {
    return this.prisma.scheduleItem.findMany({ orderBy: { displayOrder: 'asc' } });
  }

  async findOneSchedule(id: string) {
    const item = await this.prisma.scheduleItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Schedule item ${id} not found`);
    return item;
  }

  createScheduleItem(dto: CreateScheduleItemDto) {
    return this.prisma.scheduleItem.create({ data: dto });
  }

  async updateScheduleItem(id: string, dto: UpdateScheduleItemDto) {
    await this.findOneSchedule(id);
    return this.prisma.scheduleItem.update({ where: { id }, data: dto });
  }

  async removeScheduleItem(id: string) {
    await this.findOneSchedule(id);
    return this.prisma.scheduleItem.delete({ where: { id } });
  }

  // ── FAQ ────────────────────────────────────────────────────────────────────

  findAllFaqs() {
    return this.prisma.faqItem.findMany({ orderBy: { displayOrder: 'asc' } });
  }

  async findOneFaq(id: string) {
    const item = await this.prisma.faqItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`FAQ ${id} not found`);
    return item;
  }

  createFaq(dto: CreateFaqItemDto) {
    return this.prisma.faqItem.create({ data: dto });
  }

  async updateFaq(id: string, dto: UpdateFaqItemDto) {
    await this.findOneFaq(id);
    return this.prisma.faqItem.update({ where: { id }, data: dto });
  }

  async removeFaq(id: string) {
    await this.findOneFaq(id);
    return this.prisma.faqItem.delete({ where: { id } });
  }

  // ── Gallery ────────────────────────────────────────────────────────────────

  findAllGallery() {
    return this.prisma.galleryImage.findMany({ orderBy: { displayOrder: 'asc' } });
  }

  async findOneGalleryImage(id: string) {
    const item = await this.prisma.galleryImage.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Gallery image ${id} not found`);
    return item;
  }

  createGalleryImage(dto: CreateGalleryImageDto) {
    return this.prisma.galleryImage.create({ data: dto });
  }

  async updateGalleryImage(id: string, dto: UpdateGalleryImageDto) {
    await this.findOneGalleryImage(id);
    return this.prisma.galleryImage.update({ where: { id }, data: dto });
  }

  async removeGalleryImage(id: string) {
    await this.findOneGalleryImage(id);
    return this.prisma.galleryImage.delete({ where: { id } });
  }

  // ── Story Timeline ─────────────────────────────────────────────────────────

  findAllStory() {
    return this.prisma.storyTimelineItem.findMany({ orderBy: { displayOrder: 'asc' } });
  }

  async findOneStoryItem(id: string) {
    const item = await this.prisma.storyTimelineItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Story item ${id} not found`);
    return item;
  }

  createStoryItem(dto: CreateStoryTimelineItemDto) {
    return this.prisma.storyTimelineItem.create({ data: dto });
  }

  async updateStoryItem(id: string, dto: UpdateStoryTimelineItemDto) {
    await this.findOneStoryItem(id);
    return this.prisma.storyTimelineItem.update({ where: { id }, data: dto });
  }

  async removeStoryItem(id: string) {
    await this.findOneStoryItem(id);
    return this.prisma.storyTimelineItem.delete({ where: { id } });
  }

  // ── Contact ────────────────────────────────────────────────────────────────

  findAllContact() {
    return this.prisma.contactPerson.findMany({ orderBy: { displayOrder: 'asc' } });
  }

  async findOneContact(id: string) {
    const item = await this.prisma.contactPerson.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Contact ${id} not found`);
    return item;
  }

  createContact(dto: CreateContactPersonDto) {
    return this.prisma.contactPerson.create({ data: dto });
  }

  async updateContact(id: string, dto: UpdateContactPersonDto) {
    await this.findOneContact(id);
    return this.prisma.contactPerson.update({ where: { id }, data: dto });
  }

  async removeContact(id: string) {
    await this.findOneContact(id);
    return this.prisma.contactPerson.delete({ where: { id } });
  }
}
