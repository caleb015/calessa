import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { RsvpStatus } from '@prisma/client';

export class SubmitRsvpDto {
  @IsEnum(RsvpStatus)
  status!: RsvpStatus;

  @IsInt()
  @Min(0)
  attendeeCount!: number;

  @IsEmail()
  email!: string;

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
