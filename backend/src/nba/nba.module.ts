import { Module } from '@nestjs/common';
import { SleeperModule } from '@/external-providers/sleeper/sleeper.module';
import { NbaLeagueDefaultsStrategy } from './strategies/nba-league-defaults.strategy';
import { NbaTeamsGameStrategy } from './strategies/nba-teams-game.strategy';
import { NbaEventSyncStrategy } from './strategies/nba-event-sync.strategy';
import { NbaPlayerStatsStrategy } from './strategies/nba-player-stats.strategy';

@Module({
  imports: [SleeperModule],
  providers: [
    NbaLeagueDefaultsStrategy,
    NbaTeamsGameStrategy,
    NbaEventSyncStrategy,
    NbaPlayerStatsStrategy,
  ],
  exports: [
    NbaLeagueDefaultsStrategy,
    NbaTeamsGameStrategy,
    NbaEventSyncStrategy,
    NbaPlayerStatsStrategy,
  ],
})
export class NbaModule {}
