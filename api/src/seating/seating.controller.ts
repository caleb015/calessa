import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SeatingService } from './seating.service';
import { CreateSeatingTableDto, UpdateSeatingTableDto, CreateSeatingAssignmentDto, UpdateSeatingAssignmentDto } from './dto/seating.dto';

@Controller('admin/seating')
@UseGuards(JwtAuthGuard)
export class SeatingController {
  constructor(private readonly service: SeatingService) {}

  // ── Unassigned (must be before :id routes) ─────────────────────────────────

  @Get('unassigned')
  findUnassigned() {
    return this.service.findUnassignedGuests();
  }

  // ── Tables ─────────────────────────────────────────────────────────────────

  @Get('tables')
  findAllTables() { return this.service.findAllTables(); }

  @Get('tables/:id')
  findOneTable(@Param('id') id: string) { return this.service.findOneTable(id); }

  @Post('tables')
  createTable(@Body() dto: CreateSeatingTableDto) { return this.service.createTable(dto); }

  @Patch('tables/:id')
  updateTable(@Param('id') id: string, @Body() dto: UpdateSeatingTableDto) { return this.service.updateTable(id, dto); }

  @Delete('tables/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTable(@Param('id') id: string) { return this.service.removeTable(id); }

  // ── Assignments ────────────────────────────────────────────────────────────

  @Get('assignments')
  findAllAssignments() { return this.service.findAllAssignments(); }

  @Get('assignments/:id')
  findOneAssignment(@Param('id') id: string) { return this.service.findOneAssignment(id); }

  @Post('assignments')
  createAssignment(@Body() dto: CreateSeatingAssignmentDto) { return this.service.createAssignment(dto); }

  @Patch('assignments/:id')
  updateAssignment(@Param('id') id: string, @Body() dto: UpdateSeatingAssignmentDto) { return this.service.updateAssignment(id, dto); }

  @Delete('assignments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAssignment(@Param('id') id: string) { return this.service.removeAssignment(id); }
}
