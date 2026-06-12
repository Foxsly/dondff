import { Module } from '@nestjs/common';
import { WorldCupService } from './world-cup.service';
import { WorldCupLeagueDefaultsStrategy } from './strategies/world-cup-league-defaults.strategy';
import { WorldCupTeamsGameStrategy } from './strategies/world-cup-teams-game.strategy';

@Module({
  providers: [WorldCupService, WorldCupLeagueDefaultsStrategy, WorldCupTeamsGameStrategy],
  exports: [WorldCupService, WorldCupLeagueDefaultsStrategy, WorldCupTeamsGameStrategy],
})
export class WorldCupModule {}
