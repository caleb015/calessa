import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

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
}

export class UpdateDressCodeGuidelineDto {
  @IsOptional() @IsString() @MaxLength(100) label?: string;
  @IsOptional() @IsString() @MaxLength(2000) text?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
}
