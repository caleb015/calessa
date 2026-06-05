import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateScheduleItemDto {
  @IsString() @MaxLength(50) timeLabel!: string;
  @IsString() @MaxLength(200) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}

export class UpdateScheduleItemDto {
  @IsOptional() @IsString() @MaxLength(50) timeLabel?: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}
