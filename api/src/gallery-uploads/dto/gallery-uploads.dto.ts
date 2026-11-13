import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { MAX_PHOTOS_PER_UPLOAD } from '../gallery-settings.defaults';

export class UpdateGallerySettingsDto {
  @IsOptional() @IsBoolean() uploadsEnabled?: boolean;
  @IsOptional() @IsBoolean() requireApproval?: boolean;
  @IsOptional() @IsString() @MaxLength(120) heading?: string;
  @IsOptional() @IsString() @MaxLength(500) subtext?: string;
  @IsOptional() @IsString() @MaxLength(60) buttonLabel?: string;
}

export class InvitationCodeDto {
  @IsString() @MaxLength(50) code!: string;
}

/** What Cloudinary returned for one finished upload. */
export class UploadedImageDto {
  @IsString() @MaxLength(300) publicId!: string;
  @IsInt() @Min(1) version!: number;
  @Matches(/^[0-9a-f]{40}$/, { message: 'signature must be a Cloudinary upload signature' }) signature!: string;
  @IsString() @MaxLength(10) format!: string;
}

export class AddGuestUploadsDto extends InvitationCodeDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_PHOTOS_PER_UPLOAD)
  @ValidateNested({ each: true })
  @Type(() => UploadedImageDto)
  images!: UploadedImageDto[];
}
