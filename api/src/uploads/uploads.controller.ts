import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';

/** What is being uploaded: a photo (the default) or a font file. */
export class UploadSignatureDto {
  @IsOptional() @IsIn(['image', 'font']) kind?: 'image' | 'font';
}

@Controller('admin/uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly service: UploadsService) {}

  @Post('signature')
  createSignature(@Body() body: UploadSignatureDto) {
    return body?.kind === 'font' ? this.service.createFontSignature() : this.service.createSignature();
  }
}
