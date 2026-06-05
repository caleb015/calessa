import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { WeddingSettingsModule } from './wedding-settings/wedding-settings.module';
import { GuestsModule } from './guests/guests.module';
import { RsvpModule } from './rsvp/rsvp.module';
import { PublicModule } from './public/public.module';
import { AdminModule } from './admin/admin.module';
import { ContentModule } from './content/content.module';
import { SeatingModule } from './seating/seating.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, UsersModule, AuthModule, WeddingSettingsModule, GuestsModule, RsvpModule, PublicModule, AdminModule, ContentModule, SeatingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
