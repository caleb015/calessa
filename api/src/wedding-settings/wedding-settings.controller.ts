import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WeddingSettingsService } from './wedding-settings.service';
import { UpdateWeddingSettingsDto } from './dto/update-wedding-settings.dto';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard)
export class WeddingSettingsController {
  constructor(private readonly service: WeddingSettingsService) {}

  @Get()
  get() {
    return this.service.get();
  }

  @Patch()
  update(@Body() dto: UpdateWeddingSettingsDto) {
    return this.service.update(dto);
  }
}
