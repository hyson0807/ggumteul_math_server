import { IsInt, IsString, Max, Min } from 'class-validator';

export class SubmitRecommendationAnswerDto {
  @IsInt()
  problemId!: number;

  @IsString()
  answer!: string;

  @IsInt()
  @Min(0)
  @Max(3600)
  timeSpent!: number;
}
