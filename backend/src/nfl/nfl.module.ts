import { Module } from '@nestjs/common';
import { FanduelModule } from '@/external-providers/fanduel/fanduel.module';
import { SleeperModule } from '@/external-providers/sleeper/sleeper.module';
import { NflService } from './nfl.service';
import { NflLeagueDefaultsStrategy } from './strategies/nfl-league-defaults.strategy';
import { NflTeamsGameStrategy } from './strategies/nfl-teams-game.strategy';
import { NflEventSyncStrategy } from './strategies/nfl-event-sync.strategy';
import { NflPlayerStatsStrategy } from './strategies/nfl-player-stats.strategy';

@Module({
  imports: [FanduelModule, SleeperModule],
  providers: [
    NflService,
    NflLeagueDefaultsStrategy,
    NflTeamsGameStrategy,
    NflEventSyncStrategy,
    NflPlayerStatsStrategy,
  ],
  exports: [
    NflService,
    NflLeagueDefaultsStrategy,
    NflTeamsGameStrategy,
    NflEventSyncStrategy,
    NflPlayerStatsStrategy,
  ],
})
export class NflModule {}
