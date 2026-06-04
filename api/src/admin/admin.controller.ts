import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }

  @Get('export/guests.csv')
  async exportGuests(@Res() res: Response) {
    const csv = await this.service.exportGuestsCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="guests.csv"');
    res.send(csv);
  }

  @Get('export/rsvps.csv')
  async exportRsvps(@Res() res: Response) {
    const csv = await this.service.exportRsvpsCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="rsvps.csv"');
    res.send(csv);
  }
}
