import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WeddingSettingsController } from './wedding-settings.controller';
import { WeddingSettingsService } from './wedding-settings.service';

@Module({
  imports: [PrismaModule],
  controllers: [WeddingSettingsController],
  providers: [WeddingSettingsService],
  exports: [WeddingSettingsService],
})
export class WeddingSettingsModule {}
