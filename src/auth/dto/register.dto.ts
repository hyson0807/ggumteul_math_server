import { IsEmail, IsString, MinLength, Matches, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @Transform(({ value }) => (value as string).toLowerCase().trim())
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: '비밀번호는 문자와 숫자를 모두 포함해야 합니다.',
  })
  password: string;

  @IsInt()
  @Min(1)
  @Max(3)
  grade: number;
}
