import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from './email.service';
import { InviteEmailController } from './invite-email.controller';
import { InviteEmailService } from './invite-email.service';

@Module({
  imports: [PrismaModule],
  controllers: [InviteEmailController],
  providers: [EmailService, InviteEmailService],
  exports: [EmailService],
})
export class EmailModule {}
