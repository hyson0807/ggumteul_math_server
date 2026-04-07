import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VillageController } from './village.controller';
import { VillageService } from './village.service';

@Module({
  imports: [AuthModule],
  controllers: [VillageController],
  providers: [VillageService],
})
export class VillageModule {}
