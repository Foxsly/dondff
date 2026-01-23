import { FanduelModule } from '@/fanduel/fanduel.module';
import { SleeperModule } from '@/sleeper/sleeper.module';
import { Module } from '@nestjs/common';
import { PlayerStatsService } from './player-stats.service';
import { PlayerStatsController } from './player-stats.controller';

@Module({
  imports: [SleeperModule, FanduelModule],
  controllers: [PlayerStatsController],
  providers: [PlayerStatsService],
  exports: [PlayerStatsService],
})
export class PlayerStatsModule {}
