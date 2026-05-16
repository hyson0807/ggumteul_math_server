import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DktModule } from '../dkt/dkt.module';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';
import { ConceptCatalogService } from './concept-catalog.service';
import { RecommendationController } from './recommendation/recommendation.controller';
import { RecommendationService } from './recommendation/recommendation.service';

@Module({
  imports: [AuthModule, DktModule],
  controllers: [LearningController, RecommendationController],
  providers: [LearningService, ConceptCatalogService, RecommendationService],
})
export class LearningModule {}
