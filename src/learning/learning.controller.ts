import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LearningService } from './learning.service';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@Controller('learning')
@UseGuards(JwtAuthGuard)
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  @Get('stages')
  getStages(@CurrentUser('sub') userId: string) {
    return this.learning.getStages(userId);
  }

  @Get('stage/:stage/nodes')
  getStageNodes(
    @CurrentUser('sub') userId: string,
    @Param('stage', ParseIntPipe) stage: number,
  ) {
    return this.learning.getStageNodes(userId, stage);
  }

  @Get('concept/:conceptId/problems')
  getConceptProblems(
    @CurrentUser('sub') userId: string,
    @Param('conceptId', ParseIntPipe) conceptId: number,
  ) {
    return this.learning.getConceptProblems(userId, conceptId);
  }

  @Post('submit')
  submit(@CurrentUser('sub') userId: string, @Body() dto: SubmitAnswerDto) {
    return this.learning.submitAnswer(userId, dto);
  }
}
