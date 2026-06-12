import { Module } from '@nestjs/common';
import { GolfService } from './golf.service';
import { GolfLeagueDefaultsStrategy } from './strategies/golf-league-defaults.strategy';

@Module({
  providers: [GolfService, GolfLeagueDefaultsStrategy],
  exports: [GolfService, GolfLeagueDefaultsStrategy],
})
export class GolfModule {}
