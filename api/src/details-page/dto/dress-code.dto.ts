import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

/** Most example photos one guideline can show. */
export const MAX_GUIDELINE_IMAGES = 12;
const WEB_URL = /^https?:\/\/\S+$/;

const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export class UpdateDressCodeDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() @MaxLength(100) eyebrow?: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) intro?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @Matches(HEX_COLOR, { each: true, message: 'each palette color must be a hex color (e.g. #c84b7a)' })
  palette?: string[];
}

export class CreateDressCodeGuidelineDto {
  @IsString() @MaxLength(100) label!: string;
  @IsString() @MaxLength(2000) text!: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_GUIDELINE_IMAGES)
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  @Matches(WEB_URL, { each: true, message: 'each image must be a web link (http:// or https://)' })
  imageUrls?: string[];
}

export class UpdateDressCodeGuidelineDto {
  @IsOptional() @IsString() @MaxLength(100) label?: string;
  @IsOptional() @IsString() @MaxLength(2000) text?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_GUIDELINE_IMAGES)
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  @Matches(WEB_URL, { each: true, message: 'each image must be a web link (http:// or https://)' })
  imageUrls?: string[];
}
