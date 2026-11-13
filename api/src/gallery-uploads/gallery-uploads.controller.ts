import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PreviewGuard, SitePreview } from '../preview/preview.guard';
import { GalleryUploadsService } from './gallery-uploads.service';
import { AddGuestUploadsDto, InvitationCodeDto, UpdateGallerySettingsDto } from './dto/gallery-uploads.dto';

@Controller('admin/gallery-settings')
@UseGuards(JwtAuthGuard)
export class GallerySettingsAdminController {
  constructor(private readonly service: GalleryUploadsService) {}

  @Get()
  get() {
    return this.service.getSettingsForAdmin();
  }

  @Patch()
  update(@Body() dto: UpdateGallerySettingsDto) {
    return this.service.updateSettings(dto);
  }
}

/** Guest photo sharing: only invited guests (by RSVP invitation code) can upload. */
@Controller('public')
@UseGuards(PreviewGuard)
export class GalleryUploadsPublicController {
  constructor(private readonly service: GalleryUploadsService) {}

  @Get('gallery-settings')
  settings(@SitePreview() preview: boolean) {
    return this.service.getPublicSettings(preview);
  }

  @Post('gallery-uploads/verify')
  @HttpCode(HttpStatus.OK)
  verify(@Body() dto: InvitationCodeDto, @SitePreview() preview: boolean) {
    return this.service.verifyGuest(dto.code, preview);
  }

  @Post('gallery-uploads/signature')
  @HttpCode(HttpStatus.OK)
  signature(@Body() dto: InvitationCodeDto, @SitePreview() preview: boolean) {
    return this.service.createSignature(dto.code, preview);
  }

  @Post('gallery-uploads')
  add(@Body() dto: AddGuestUploadsDto, @SitePreview() preview: boolean) {
    return this.service.addUploads(dto.code, dto.images, preview);
  }
}
