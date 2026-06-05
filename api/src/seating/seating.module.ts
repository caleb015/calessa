import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SeatingController } from './seating.controller';
import { SeatingService } from './seating.service';

@Module({
  imports: [PrismaModule],
  controllers: [SeatingController],
  providers: [SeatingService],
})
export class SeatingModule {}
