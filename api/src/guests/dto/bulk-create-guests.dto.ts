import { ArrayMaxSize, ArrayMinSize, IsArray, IsObject } from 'class-validator';

export class BulkCreateGuestsDto {
  // Rows are validated one by one in the service, so a bad row is skipped (and reported)
  // instead of rejecting the whole import.
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @IsObject({ each: true })
  guests!: Record<string, unknown>[];
}
