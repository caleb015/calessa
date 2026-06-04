import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';

@Module({
  imports: [PrismaModule],
  controllers: [GuestsController],
  providers: [GuestsService],
  exports: [GuestsService],
})
export class GuestsModule {}
