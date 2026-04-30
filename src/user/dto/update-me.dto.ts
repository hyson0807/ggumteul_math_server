import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  grade?: number;
}
