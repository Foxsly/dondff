import { Module } from '@nestjs/common';
import { WorldCupService } from './world-cup.service';

@Module({
  providers: [WorldCupService],
  exports: [WorldCupService],
})
export class WorldCupModule {}
