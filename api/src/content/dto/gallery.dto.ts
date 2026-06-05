import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateGalleryImageDto {
  @IsString() imageUrl!: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}

export class UpdateGalleryImageDto {
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}
