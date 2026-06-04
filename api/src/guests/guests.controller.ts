import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GuestsService } from './guests.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { BulkCreateGuestsDto } from './dto/bulk-create-guests.dto';

@Controller('admin/guests')
@UseGuards(JwtAuthGuard)
export class GuestsController {
  constructor(private readonly service: GuestsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post('bulk')
  bulkCreate(@Body() dto: BulkCreateGuestsDto) {
    return this.service.bulkCreate(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateGuestDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGuestDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
