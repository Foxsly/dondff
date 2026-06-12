import { Module } from '@nestjs/common';
import { NflService } from './nfl.service';
import { NflLeagueDefaultsStrategy } from './strategies/nfl-league-defaults.strategy';
import { NflTeamsGameStrategy } from './strategies/nfl-teams-game.strategy';

@Module({
  providers: [NflService, NflLeagueDefaultsStrategy, NflTeamsGameStrategy],
  exports: [NflService, NflLeagueDefaultsStrategy, NflTeamsGameStrategy],
})
export class NflModule {}
