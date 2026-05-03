import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DktModule } from '../dkt/dkt.module';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';

@Module({
  imports: [AuthModule, DktModule],
  controllers: [LearningController],
  providers: [LearningService],
})
export class LearningModule {}
