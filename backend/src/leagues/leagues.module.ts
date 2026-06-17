import { db } from '@/infrastructure/database/database';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { forwardRef, Module } from '@nestjs/common';
import { TeamsModule } from '@/teams/teams.module';
import { NflModule } from '@/nfl/nfl.module';
import { GolfModule } from '@/golf/golf.module';
import { WorldCupModule } from '@/world-cup/world-cup.module';
import { LeaguesController } from './leagues.controller';
import { DatabaseLeaguesRepository, LeaguesRepository } from './leagues.repository';
import { LeaguesService } from './leagues.service';
import { LeagueDefaultsStrategyRegistry } from './strategies/league-defaults-strategy.registry';

@Module({
  controllers: [LeaguesController],
  providers: [
    LeaguesService,
    LeagueDefaultsStrategyRegistry,
    {
      provide: 'DB_CONNECTION',
      useValue: db,
    },
    {
      provide: LeaguesRepository,
      useClass: DatabaseLeaguesRepository,
    },
  ],
  imports: [DatabaseModule, forwardRef(() => TeamsModule), NflModule, GolfModule, WorldCupModule],
  exports: [LeaguesService],
})
export class LeaguesModule {}
