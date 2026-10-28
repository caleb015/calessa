import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PreviewController } from './preview.controller';
import { PreviewGuard } from './preview.guard';
import { PreviewService } from './preview.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: `${config.getOrThrow<string>('JWT_SECRET')}:preview`,
        signOptions: { expiresIn: '2h' },
      }),
    }),
  ],
  controllers: [PreviewController],
  providers: [PreviewService, PreviewGuard],
  exports: [PreviewService, PreviewGuard],
})
export class PreviewModule {}
