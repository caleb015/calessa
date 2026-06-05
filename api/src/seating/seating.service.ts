import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeatingTableDto, UpdateSeatingTableDto, CreateSeatingAssignmentDto, UpdateSeatingAssignmentDto } from './dto/seating.dto';

@Injectable()
export class SeatingService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Tables ─────────────────────────────────────────────────────────────────

  findAllTables() {
    return this.prisma.seatingTable.findMany({
      orderBy: { name: 'asc' },
      include: { assignments: { include: { guest: true } } },
    });
  }

  async findOneTable(id: string) {
    const table = await this.prisma.seatingTable.findUnique({
      where: { id },
      include: { assignments: { include: { guest: true } } },
    });
    if (!table) throw new NotFoundException(`Table ${id} not found`);
    return table;
  }

  createTable(dto: CreateSeatingTableDto) {
    return this.prisma.seatingTable.create({ data: dto });
  }

  async updateTable(id: string, dto: UpdateSeatingTableDto) {
    await this.findOneTable(id);
    return this.prisma.seatingTable.update({ where: { id }, data: dto });
  }

  async removeTable(id: string) {
    await this.findOneTable(id);
    return this.prisma.seatingTable.delete({ where: { id } });
  }

  // ── Assignments ────────────────────────────────────────────────────────────

  findAllAssignments() {
    return this.prisma.seatingAssignment.findMany({
      include: { guest: true, table: true },
    });
  }

  async findOneAssignment(id: string) {
    const assignment = await this.prisma.seatingAssignment.findUnique({
      where: { id },
      include: { guest: true, table: true },
    });
    if (!assignment) throw new NotFoundException(`Assignment ${id} not found`);
    return assignment;
  }

  async createAssignment(dto: CreateSeatingAssignmentDto) {
    const existing = await this.prisma.seatingAssignment.findUnique({
      where: { guestId: dto.guestId },
    });
    if (existing) throw new ConflictException(`Guest is already assigned to a table`);
    return this.prisma.seatingAssignment.create({
      data: dto,
      include: { guest: true, table: true },
    });
  }

  async updateAssignment(id: string, dto: UpdateSeatingAssignmentDto) {
    await this.findOneAssignment(id);
    return this.prisma.seatingAssignment.update({
      where: { id },
      data: dto,
      include: { guest: true, table: true },
    });
  }

  async removeAssignment(id: string) {
    await this.findOneAssignment(id);
    return this.prisma.seatingAssignment.delete({ where: { id } });
  }

  // ── Unassigned guests ──────────────────────────────────────────────────────

  async findUnassignedGuests() {
    return this.prisma.guest.findMany({
      where: { seatingAssignment: null },
      orderBy: { primaryName: 'asc' },
      include: { rsvp: true },
    });
  }
}
