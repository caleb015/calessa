import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PreviewGuard, SitePreview } from '../preview/preview.guard';
import { RsvpService } from './rsvp.service';
import { SubmitRsvpDto } from './dto/submit-rsvp.dto';
import { AdminUpdateRsvpDto } from './dto/admin-update-rsvp.dto';

// ── Public endpoints (no auth) ───────────────────────────────────────────────

@Controller('public/rsvp')
export class PublicRsvpController {
  constructor(private readonly service: RsvpService) {}

  // Preview lets an admin look up an invitation while the site is private; submitting stays blocked.
  @Get(':code')
  @UseGuards(PreviewGuard)
  getByCode(@Param('code') code: string, @SitePreview() preview: boolean) {
    return this.service.getByCode(code, preview);
  }

  @Post(':code')
  submitByCode(@Param('code') code: string, @Body() dto: SubmitRsvpDto) {
    return this.service.submitByCode(code, dto);
  }
}

// ── Admin endpoints (JWT protected) ─────────────────────────────────────────

@Controller('admin/rsvps')
@UseGuards(JwtAuthGuard)
export class AdminRsvpController {
  constructor(private readonly service: RsvpService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: AdminUpdateRsvpDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
