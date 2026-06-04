import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { RsvpStatus } from '@prisma/client';

export class AdminUpdateRsvpDto {
  @IsOptional()
  @IsEnum(RsvpStatus)
  status?: RsvpStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  attendeeCount?: number;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  plusOneName?: string;

  @IsOptional()
  @IsString()
  mealPreference?: string;

  @IsOptional()
  @IsString()
  dietaryRestrictions?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  songRequest?: string;
}
