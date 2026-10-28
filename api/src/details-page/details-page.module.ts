import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DetailsPageAdminController, DetailsPagePublicController } from './details-page.controller';
import { DetailsPageService } from './details-page.service';
import { DressCodeAdminController } from './dress-code.controller';
import { DressCodeService } from './dress-code.service';

@Module({
  imports: [PrismaModule],
  controllers: [DetailsPageAdminController, DetailsPagePublicController, DressCodeAdminController],
  providers: [DetailsPageService, DressCodeService],
})
export class DetailsPageModule {}
