import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateFaqItemDto {
  @IsString() question!: string;
  @IsString() answer!: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}

export class UpdateFaqItemDto {
  @IsOptional() @IsString() question?: string;
  @IsOptional() @IsString() answer?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}
