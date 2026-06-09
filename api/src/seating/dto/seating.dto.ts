import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateSeatingTableDto {
  @IsOptional() @IsInt() @Min(1) tableNumber?: number;
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateSeatingTableDto {
  @IsOptional() @IsInt() @Min(1) tableNumber?: number;
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateSeatingAssignmentDto {
  @IsString() guestId!: string;
  @IsString() tableId!: string;
  @IsOptional() @IsString() seatLabel?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateSeatingAssignmentDto {
  @IsOptional() @IsString() tableId?: string;
  @IsOptional() @IsString() seatLabel?: string;
  @IsOptional() @IsString() notes?: string;
}
