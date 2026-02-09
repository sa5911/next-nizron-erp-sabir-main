import { IsString, IsOptional, IsUrl, IsEmail } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCompanySettingsDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  logo_url?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  r2_access_key_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  r2_secret_access_key?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  r2_endpoint?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  r2_bucket_name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  r2_public_url_prefix?: string;
}
