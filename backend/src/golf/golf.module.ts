import { Module } from '@nestjs/common';
import { GolfService } from './golf.service';
import { GolfLeagueDefaultsStrategy } from './strategies/golf-league-defaults.strategy';
import { GolfTeamsGameStrategy } from './strategies/golf-teams-game.strategy';

@Module({
  providers: [GolfService, GolfLeagueDefaultsStrategy, GolfTeamsGameStrategy],
  exports: [GolfService, GolfLeagueDefaultsStrategy, GolfTeamsGameStrategy],
})
export class GolfModule {}
