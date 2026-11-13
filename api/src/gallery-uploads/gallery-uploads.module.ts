import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PreviewModule } from '../preview/preview.module';
import { UploadsModule } from '../uploads/uploads.module';
import { GallerySettingsAdminController, GalleryUploadsPublicController } from './gallery-uploads.controller';
import { GalleryUploadsService } from './gallery-uploads.service';

@Module({
  imports: [PrismaModule, PreviewModule, UploadsModule],
  controllers: [GallerySettingsAdminController, GalleryUploadsPublicController],
  providers: [GalleryUploadsService],
})
export class GalleryUploadsModule {}
