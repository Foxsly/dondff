import { Module } from '@nestjs/common';
import { SleeperModule } from '@/external-providers/sleeper/sleeper.module';
import { NflService } from './nfl.service';
import { NflLeagueDefaultsStrategy } from './strategies/nfl-league-defaults.strategy';
import { NflTeamsGameStrategy } from './strategies/nfl-teams-game.strategy';
import { NflEventSyncStrategy } from './strategies/nfl-event-sync.strategy';

@Module({
  imports: [SleeperModule],
  providers: [NflService, NflLeagueDefaultsStrategy, NflTeamsGameStrategy, NflEventSyncStrategy],
  exports: [NflService, NflLeagueDefaultsStrategy, NflTeamsGameStrategy, NflEventSyncStrategy],
})
export class NflModule {}
