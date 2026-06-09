import { Module } from '@nestjs/common';
import { WorldCupService } from './world-cup.service';
import { WorldCupController } from './world-cup.controller';

@Module({
  controllers: [WorldCupController],
  providers: [WorldCupService],
})
export class WorldCupModule {}
