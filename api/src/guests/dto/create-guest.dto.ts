import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

// Trims text and treats a blank optional field as "not provided" (forms send '' for empty inputs).
const blankToUndefined = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value));

export class CreateGuestDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  primaryName!: string;

  @blankToUndefined()
  @IsOptional()
  @IsEmail()
  email?: string;

  @blankToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @blankToUndefined()
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
  @IsBoolean()
  requiresMealSelection?: boolean;

  @blankToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  invitationCode?: string;

  @blankToUndefined()
  @IsOptional()
  @IsString()
  notes?: string;
}
