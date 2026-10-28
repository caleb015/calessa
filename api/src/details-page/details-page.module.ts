import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PreviewModule } from '../preview/preview.module';
import { DetailsPageAdminController, DetailsPagePublicController } from './details-page.controller';
import { DetailsPageService } from './details-page.service';
import { DressCodeAdminController } from './dress-code.controller';
import { DressCodeService } from './dress-code.service';

@Module({
  imports: [PrismaModule, PreviewModule],
  controllers: [DetailsPageAdminController, DetailsPagePublicController, DressCodeAdminController],
  providers: [DetailsPageService, DressCodeService],
})
export class DetailsPageModule {}
