import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateEventDto {
  @IsOptional() @IsString() @MaxLength(100) tagline?: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional() @IsString() venueName?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsDateString() startTime?: string;
  @IsOptional() @IsDateString() endTime?: string;
  @IsOptional() @IsString() mapUrl?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @IsOptional() @IsBoolean() showOnHomepage?: boolean;
}

export class UpdateEventDto {
  @IsOptional() @IsString() @MaxLength(100) tagline?: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() venueName?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsDateString() startTime?: string;
  @IsOptional() @IsDateString() endTime?: string;
  @IsOptional() @IsString() mapUrl?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @IsOptional() @IsBoolean() showOnHomepage?: boolean;
}
