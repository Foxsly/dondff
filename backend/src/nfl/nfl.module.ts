import { Module } from '@nestjs/common';
import { NflService } from './nfl.service';
import { NflLeagueDefaultsStrategy } from './strategies/nfl-league-defaults.strategy';

@Module({
  providers: [NflService, NflLeagueDefaultsStrategy],
  exports: [NflService, NflLeagueDefaultsStrategy],
})
export class NflModule {}
