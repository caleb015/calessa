import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateDressCodeGuidelineDto, UpdateDressCodeDto, UpdateDressCodeGuidelineDto } from './dto/dress-code.dto';
import { DressCodeService } from './dress-code.service';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class DressCodeAdminController {
  constructor(private readonly service: DressCodeService) {}

  @Get('dress-code') getSettings() { return this.service.getSettings(); }
  @Patch('dress-code') updateSettings(@Body() dto: UpdateDressCodeDto) { return this.service.updateSettings(dto); }

  @Get('dress-code-guidelines') findAll() { return this.service.findAllGuidelines(); }
  @Get('dress-code-guidelines/:id') findOne(@Param('id') id: string) { return this.service.findOneGuideline(id); }
  @Post('dress-code-guidelines') create(@Body() dto: CreateDressCodeGuidelineDto) { return this.service.createGuideline(dto); }
  @Patch('dress-code-guidelines/:id') update(@Param('id') id: string, @Body() dto: UpdateDressCodeGuidelineDto) { return this.service.updateGuideline(id, dto); }
  @Delete('dress-code-guidelines/:id') @HttpCode(HttpStatus.NO_CONTENT) remove(@Param('id') id: string) { return this.service.removeGuideline(id); }
}
