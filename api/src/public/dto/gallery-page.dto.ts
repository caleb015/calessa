import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const GALLERY_PAGE_SIZE = 48;
export const MAX_GALLERY_PAGE_SIZE = 100;

/** One page of the public gallery: `limit` photos starting after the first `offset`. */
export class GalleryPageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(MAX_GALLERY_PAGE_SIZE) limit?: number;
}
