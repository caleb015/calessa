import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateGuestDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  primaryName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  group?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  allowedPartySize?: number;

  @IsOptional()
  @IsBoolean()
  plusOneAllowed?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  invitationCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
