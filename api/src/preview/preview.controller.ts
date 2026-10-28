import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PreviewService } from './preview.service';

@Controller('admin/preview-token')
@UseGuards(JwtAuthGuard)
export class PreviewController {
  constructor(private readonly preview: PreviewService) {}

  @Post()
  issue(@Req() req: { user: { userId: string } }) {
    return this.preview.issue(req.user.userId);
  }
}
