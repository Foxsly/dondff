import { Module } from '@nestjs/common';
import { FanduelModule } from '@/external-providers/fanduel/fanduel.module';
import { EspnModule } from '@/external-providers/espn/espn.module';
import { GolfService } from './golf.service';
import { GolfLeagueDefaultsStrategy } from './strategies/golf-league-defaults.strategy';
import { GolfTeamsGameStrategy } from './strategies/golf-teams-game.strategy';
import { GolfEventSyncStrategy } from './strategies/golf-event-sync.strategy';
import { GolfPlayerStatsStrategy } from './strategies/golf-player-stats.strategy';

@Module({
  imports: [FanduelModule, EspnModule],
  providers: [
    GolfService,
    GolfLeagueDefaultsStrategy,
    GolfTeamsGameStrategy,
    GolfEventSyncStrategy,
    GolfPlayerStatsStrategy,
  ],
  exports: [
    GolfService,
    GolfLeagueDefaultsStrategy,
    GolfTeamsGameStrategy,
    GolfEventSyncStrategy,
    GolfPlayerStatsStrategy,
  ],
})
export class GolfModule {}
