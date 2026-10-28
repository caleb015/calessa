import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PreviewModule } from '../preview/preview.module';
import { PublicRsvpController, AdminRsvpController } from './rsvp.controller';
import { RsvpService } from './rsvp.service';

@Module({
  imports: [PrismaModule, PreviewModule],
  controllers: [PublicRsvpController, AdminRsvpController],
  providers: [RsvpService],
  exports: [RsvpService],
})
export class RsvpModule {}
