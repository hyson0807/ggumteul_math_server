import { Module } from '@nestjs/common';
import { DktService } from './dkt.service';

@Module({
  providers: [DktService],
  exports: [DktService],
})
export class DktModule {}
