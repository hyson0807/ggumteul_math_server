import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['cat', 'rabbit'])
  tutorType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  grade?: number;
}
