import { IsOptional, IsString } from 'class-validator';

export class AppleAuthDto {
  @IsString()
  identityToken: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  email?: string;
}
