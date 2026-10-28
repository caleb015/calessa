import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDetailsPageDto {
  @IsOptional() @IsString() @MaxLength(100) headerEyebrow?: string;
  @IsOptional() @IsString() @MaxLength(200) headerTitle?: string;
  @IsOptional() @IsString() @MaxLength(200) location?: string;
  @IsOptional() @IsBoolean() showAddToCalendar?: boolean;
  @IsOptional() @IsBoolean() ctaEnabled?: boolean;
  @IsOptional() @IsString() @MaxLength(200) ctaHeading?: string;
  @IsOptional() @IsString() @MaxLength(500) ctaSubtext?: string;
  @IsOptional() @IsString() @MaxLength(100) ctaButtonLabel?: string;
}
