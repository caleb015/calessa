import { IsBoolean, IsDateString, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// Empty string is allowed — it means "clear this override and use the default".
const HEX_COLOR = /^$|^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

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
  @MaxLength(200)
  rsvpTagline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  rsvpSubtext?: string;

  @IsOptional()
  @Matches(HEX_COLOR, { message: 'themeBackground must be a hex color (e.g. #faf7f2)' })
  themeBackground?: string;

  @IsOptional()
  @Matches(HEX_COLOR, { message: 'themeForeground must be a hex color (e.g. #1e2b1a)' })
  themeForeground?: string;

  @IsOptional()
  @Matches(HEX_COLOR, { message: 'themeMuted must be a hex color (e.g. #7a8e82)' })
  themeMuted?: string;

  @IsOptional()
  @Matches(HEX_COLOR, { message: 'themeAccent must be a hex color (e.g. #c84b7a)' })
  themeAccent?: string;

  @IsOptional()
  @Matches(HEX_COLOR, { message: 'themeBorder must be a hex color (e.g. #e2d8d0)' })
  themeBorder?: string;

  @IsOptional()
  @Matches(HEX_COLOR, { message: 'themeSurface must be a hex color (e.g. #f2ede8)' })
  themeSurface?: string;

  @IsOptional()
  @Matches(HEX_COLOR, { message: 'themeInverseBackground must be a hex color (e.g. #1a2618)' })
  themeInverseBackground?: string;

  @IsOptional()
  @Matches(HEX_COLOR, { message: 'themeOverlayText must be a hex color (e.g. #ffffff)' })
  themeOverlayText?: string;

  @IsOptional()
  @Matches(HEX_COLOR, { message: 'themeOverlayScrim must be a hex color (e.g. #000000)' })
  themeOverlayScrim?: string;

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
