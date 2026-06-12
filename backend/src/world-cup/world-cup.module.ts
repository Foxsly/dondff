import { Module } from '@nestjs/common';
import { FifaModule } from '@/external-providers/fifa/fifa.module';
import { WorldCupService } from './world-cup.service';
import { WorldCupLeagueDefaultsStrategy } from './strategies/world-cup-league-defaults.strategy';
import { WorldCupTeamsGameStrategy } from './strategies/world-cup-teams-game.strategy';
import { WorldCupEventSyncStrategy } from './strategies/world-cup-event-sync.strategy';

@Module({
  imports: [FifaModule],
  providers: [WorldCupService, WorldCupLeagueDefaultsStrategy, WorldCupTeamsGameStrategy, WorldCupEventSyncStrategy],
  exports: [WorldCupService, WorldCupLeagueDefaultsStrategy, WorldCupTeamsGameStrategy, WorldCupEventSyncStrategy],
})
export class WorldCupModule {}
