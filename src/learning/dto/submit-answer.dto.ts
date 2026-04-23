import { IsInt, IsString, Max, Min } from 'class-validator';

export class SubmitAnswerDto {
  @IsInt()
  problemId!: number;

  @IsString()
  answer!: string;

  @IsInt()
  @Min(0)
  @Max(3600)
  timeSpent!: number;
}
