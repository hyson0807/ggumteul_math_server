import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SubmitRecommendationAnswerDto {
  @IsInt()
  problemId!: number;

  // startSession 이 발급한 추천 세션 식별자. 같은 세션의 문제들을 묶는다.
  // (구버전 앱 호환을 위해 optional — 없으면 과거 내역에서 날짜 단위로 fallback)
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsString()
  answer!: string;

  @IsInt()
  @Min(0)
  @Max(3600)
  timeSpent!: number;
}
