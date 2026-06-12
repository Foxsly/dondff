import { Module } from '@nestjs/common';
import { FifaModule } from '@/external-providers/fifa/fifa.module';
import { WorldCupService } from './world-cup.service';
import { WorldCupLeagueDefaultsStrategy } from './strategies/world-cup-league-defaults.strategy';
import { WorldCupTeamsGameStrategy } from './strategies/world-cup-teams-game.strategy';
import { WorldCupEventSyncStrategy } from './strategies/world-cup-event-sync.strategy';
import { WorldCupPlayerStatsStrategy } from './strategies/world-cup-player-stats.strategy';

@Module({
  imports: [FifaModule],
  providers: [
    WorldCupService,
    WorldCupLeagueDefaultsStrategy,
    WorldCupTeamsGameStrategy,
    WorldCupEventSyncStrategy,
    WorldCupPlayerStatsStrategy,
  ],
  exports: [
    WorldCupService,
    WorldCupLeagueDefaultsStrategy,
    WorldCupTeamsGameStrategy,
    WorldCupEventSyncStrategy,
    WorldCupPlayerStatsStrategy,
  ],
})
export class WorldCupModule {}
