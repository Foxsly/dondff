import { EventsModule } from '@/events/events.module';
import { FifaModule } from '@/external-providers/fifa/fifa.module';
import { FanduelModule } from '@/external-providers/fanduel/fanduel.module';
import { SleeperModule } from '@/external-providers/sleeper/sleeper.module';
import { Module } from '@nestjs/common';
import { PlayerStatsController } from './player-stats.controller';
import { PlayerStatsService } from './player-stats.service';

@Module({
  imports: [SleeperModule, FanduelModule, EventsModule, FifaModule],
  controllers: [PlayerStatsController],
  providers: [PlayerStatsService],
  exports: [PlayerStatsService],
})
export class PlayerStatsModule {}
