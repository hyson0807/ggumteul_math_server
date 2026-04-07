import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class GoogleAuthDto {
  @IsString()
  @IsOptional()
  idToken?: string;

  @IsString()
  @IsOptional()
  accessToken?: string;

  @ValidateIf((o: GoogleAuthDto) => !o.idToken && !o.accessToken)
  @IsString()
  _atLeastOne?: string;
}
