import { IsEmail, IsString, MinLength, IsInt, Min, Max } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsInt()
  @Min(1)
  @Max(3)
  grade: number;
}
