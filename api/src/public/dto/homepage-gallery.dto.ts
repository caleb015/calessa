import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const HOMEPAGE_GALLERY_PAGE_SIZE = 12;
export const MAX_HOMEPAGE_GALLERY_PAGE_SIZE = 48;
export const MAX_SHUFFLE_SEED = 2147483647;

/**
 * One page of the homepage's Moments photos. `seed` keeps one visitor's random order the same from
 * page to page (it is handed out with the first page when random order is on).
 */
export class HomepageGalleryQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(MAX_HOMEPAGE_GALLERY_PAGE_SIZE) limit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(MAX_SHUFFLE_SEED) seed?: number;
}
