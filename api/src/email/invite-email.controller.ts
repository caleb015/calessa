import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InviteEmailDto } from './dto/invite-email.dto';
import { InviteEmailService } from './invite-email.service';

@Controller('admin/invite-email')
@UseGuards(JwtAuthGuard)
export class InviteEmailController {
  constructor(private readonly service: InviteEmailService) {}

  @Get()
  get() {
    return this.service.get();
  }

  @Patch()
  update(@Body() dto: InviteEmailDto) {
    return this.service.update(dto);
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  preview(@Body() dto: InviteEmailDto) {
    return this.service.preview(dto);
  }
}
