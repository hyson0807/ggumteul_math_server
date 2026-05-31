import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RecommendationService } from './recommendation.service';
import { SubmitRecommendationAnswerDto } from './dto/submit-recommendation-answer.dto';

@Controller('learning/recommendation')
@UseGuards(JwtAuthGuard)
export class RecommendationController {
  constructor(private readonly recommendation: RecommendationService) {}

  @Post('session/start')
  startSession(@CurrentUser('sub') userId: string) {
    return this.recommendation.startSession(userId);
  }

  @Post('submit')
  submit(
    @CurrentUser('sub') userId: string,
    @Body() dto: SubmitRecommendationAnswerDto,
  ) {
    return this.recommendation.submitAnswer(userId, dto);
  }

  @Get('history')
  getHistory(@CurrentUser('sub') userId: string) {
    return this.recommendation.getHistory(userId);
  }
}
