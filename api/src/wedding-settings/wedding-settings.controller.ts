import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WeddingSettingsService } from './wedding-settings.service';
import { UpdateWeddingSettingsDto } from './dto/update-wedding-settings.dto';
import { INVITE_FIELDS } from '../email/invite-template';

// Invite template columns live on the same row but are managed via /admin/invite-email.
// Leaving them out keeps this response round-trippable into UpdateWeddingSettingsDto.
function withoutInviteFields<T extends object>(settings: T): Partial<T> {
  const fields: readonly string[] = INVITE_FIELDS;
  return Object.fromEntries(Object.entries(settings).filter(([key]) => !fields.includes(key))) as Partial<T>;
}

@Controller('admin/settings')
@UseGuards(JwtAuthGuard)
export class WeddingSettingsController {
  constructor(private readonly service: WeddingSettingsService) {}

  @Get()
  async get() {
    return withoutInviteFields(await this.service.get());
  }

  @Patch()
  async update(@Body() dto: UpdateWeddingSettingsDto) {
    return withoutInviteFields(await this.service.update(dto));
  }
}
