import { Module } from '@nestjs/common';
import { FanduelModule } from '@/external-providers/fanduel/fanduel.module';
import { EspnModule } from '@/external-providers/espn/espn.module';
import { GolfService } from './golf.service';
import { GolfLeagueDefaultsStrategy } from './strategies/golf-league-defaults.strategy';
import { GolfTeamsGameStrategy } from './strategies/golf-teams-game.strategy';
import { GolfEventSyncStrategy } from './strategies/golf-event-sync.strategy';

@Module({
  imports: [FanduelModule, EspnModule],
  providers: [GolfService, GolfLeagueDefaultsStrategy, GolfTeamsGameStrategy, GolfEventSyncStrategy],
  exports: [GolfService, GolfLeagueDefaultsStrategy, GolfTeamsGameStrategy, GolfEventSyncStrategy],
})
export class GolfModule {}
