import { Module } from '@nestjs/common';
import { WorldCupService } from './world-cup.service';
import { WorldCupLeagueDefaultsStrategy } from './strategies/world-cup-league-defaults.strategy';

@Module({
  providers: [WorldCupService, WorldCupLeagueDefaultsStrategy],
  exports: [WorldCupService, WorldCupLeagueDefaultsStrategy],
})
export class WorldCupModule {}
