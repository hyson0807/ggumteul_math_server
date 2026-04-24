import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WormController } from './worm.controller';
import { WormService } from './worm.service';

@Module({
  imports: [AuthModule],
  controllers: [WormController],
  providers: [WormService],
})
export class WormModule {}
