import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PreviewModule } from '../preview/preview.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [PrismaModule, PreviewModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
