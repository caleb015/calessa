import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

// Empty string is allowed — it means "clear this override and use the default".
// For photo links, an empty string removes the photo.
const PHOTO_URL = /^$|^https?:\/\/\S+$/;
// Font names: letters, digits, spaces and hyphens (a Google Fonts family, or a label for an uploaded font).
const FONT_NAME = /^$|^[A-Za-z0-9][A-Za-z0-9 -]{0,59}$/;
// Uploaded font files: a secure web link to a font file.
const FONT_URL = /^$|^https:\/\/[^\s"'()<>]+\.(woff2|woff|ttf|otf)$/i;
// Hero text placement: how it lines up, and a sideways shift in pixels or percent (a plain number is pixels).
const HERO_TEXT_ALIGNS = ['', 'left', 'center', 'right', 'justify'];
const HERO_TEXT_OFFSET = /^$|^-?\d{1,4}(\.\d{1,2})?(px|%)?$/;
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
  @IsInt()
  @Min(-50)
  @Max(50)
  heroImageOffsetX?: number;

  @IsOptional()
  @IsInt()
  @Min(-50)
  @Max(50)
  heroImageOffsetY?: number;

  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(200)
  heroImageHeight?: number;

  @IsOptional()
  @IsString()
  @Matches(PHOTO_URL)
  heroMobileImageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(-50)
  @Max(50)
  heroMobileImageOffsetY?: number;

  @IsOptional()
  @IsIn(HERO_TEXT_ALIGNS)
  heroTextAlign?: string;

  @IsOptional()
  @IsString()
  @Matches(HERO_TEXT_OFFSET, { message: 'heroTextOffset must be a number of pixels or a percentage, e.g. 120px or 10%' })
  heroTextOffset?: string;

  @IsOptional()
  @IsString()
  @Matches(HERO_TEXT_OFFSET, { message: 'heroTextOffsetY must be a number of pixels or a percentage, e.g. 40px or -10%' })
  heroTextOffsetY?: string;

  @IsOptional()
  @IsString()
  @Matches(HERO_TEXT_OFFSET, { message: 'heroMobileTextOffsetY must be a number of pixels or a percentage, e.g. 40px or -10%' })
  heroMobileTextOffsetY?: string;

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
  @IsString()
  @Matches(FONT_NAME, { message: 'fontHeading must be a font name (letters, numbers, spaces and hyphens)' })
  fontHeading?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Matches(FONT_URL, { message: 'fontHeadingUrl must be an https link to a .woff2, .woff, .ttf or .otf file' })
  fontHeadingUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(FONT_NAME, { message: 'fontBody must be a font name (letters, numbers, spaces and hyphens)' })
  fontBody?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Matches(FONT_URL, { message: 'fontBodyUrl must be an https link to a .woff2, .woff, .ttf or .otf file' })
  fontBodyUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(FONT_NAME, { message: 'fontAccent must be a font name (letters, numbers, spaces and hyphens)' })
  fontAccent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Matches(FONT_URL, { message: 'fontAccentUrl must be an https link to a .woff2, .woff, .ttf or .otf file' })
  fontAccentUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(FONT_NAME, { message: 'fontHero must be a font name (letters, numbers, spaces and hyphens)' })
  fontHero?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Matches(FONT_URL, { message: 'fontHeroUrl must be an https link to a .woff2, .woff, .ttf or .otf file' })
  fontHeroUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  rsvpHeading?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Matches(PHOTO_URL, { message: 'welcomeImageUrl must be a web link (https://…)' })
  welcomeImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Matches(PHOTO_URL, { message: 'rsvpBannerImageUrl must be a web link (https://…)' })
  rsvpBannerImageUrl?: string;

  @IsOptional()
  @IsBoolean()
  homepageGalleryShuffle?: boolean;

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
