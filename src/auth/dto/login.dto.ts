import { IsEmail, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @Transform(({ value }) => (value as string).toLowerCase().trim())
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
