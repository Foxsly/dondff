import { EventsModule } from '@/events/events.module';
import { NflModule } from '@/nfl/nfl.module';
import { GolfModule } from '@/golf/golf.module';
import { WorldCupModule } from '@/world-cup/world-cup.module';
import { Module } from '@nestjs/common';
import { PlayerStatsController } from './player-stats.controller';
import { PlayerStatsService } from './player-stats.service';
import { PlayerStatsStrategyRegistry } from './strategies/player-stats-strategy.registry';

@Module({
  imports: [EventsModule, NflModule, GolfModule, WorldCupModule],
  controllers: [PlayerStatsController],
  providers: [PlayerStatsService, PlayerStatsStrategyRegistry],
  exports: [PlayerStatsService],
})
export class PlayerStatsModule {}
