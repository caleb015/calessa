import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWeddingSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  coupleNameA?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  coupleNameB?: string;

  @IsOptional()
  @IsDateString()
  weddingDate?: string;

  @IsOptional()
  @IsDateString()
  rsvpDeadline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  siteTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  siteDescription?: string;

  @IsOptional()
  @IsString()
  heroImageUrl?: string;

  @IsOptional()
  @IsString()
  monogramUrl?: string;

  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isRsvpEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  allowMaybe?: boolean;

  @IsOptional()
  @IsBoolean()
  enableMealPreference?: boolean;

  @IsOptional()
  @IsBoolean()
  enableSongRequest?: boolean;

  @IsOptional()
  @IsBoolean()
  enableGuestbook?: boolean;

  @IsOptional()
  @IsBoolean()
  requireUniqueTableNumbers?: boolean;

  @IsOptional()
  @IsBoolean()
  requireUniqueTableNames?: boolean;
}
