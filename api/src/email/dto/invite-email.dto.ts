import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// Empty string clears an override so the default is used.
const HEX_COLOR = /^$|^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const colorMessage = (field: string) => `${field} must be a hex color (e.g. #5a4a3a)`;

export class InviteEmailDto {
  @IsOptional() @IsString() @MaxLength(200) inviteSubject?: string;
  @IsOptional() @IsString() @MaxLength(200) inviteHeading?: string;
  @IsOptional() @IsString() @MaxLength(200) inviteTagline?: string;
  @IsOptional() @IsString() @MaxLength(200) inviteGreeting?: string;
  @IsOptional() @IsString() @MaxLength(5000) inviteMessage?: string;
  @IsOptional() @IsString() @MaxLength(50) inviteButtonText?: string;
  @IsOptional() @IsString() @MaxLength(200) inviteSignoff?: string;

  @IsOptional() @Matches(HEX_COLOR, { message: colorMessage('inviteBackgroundColor') }) inviteBackgroundColor?: string;
  @IsOptional() @Matches(HEX_COLOR, { message: colorMessage('inviteTextColor') }) inviteTextColor?: string;
  @IsOptional() @Matches(HEX_COLOR, { message: colorMessage('inviteAccentColor') }) inviteAccentColor?: string;
  @IsOptional() @Matches(HEX_COLOR, { message: colorMessage('inviteMutedColor') }) inviteMutedColor?: string;
  @IsOptional() @Matches(HEX_COLOR, { message: colorMessage('inviteButtonTextColor') }) inviteButtonTextColor?: string;
}
