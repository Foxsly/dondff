import { forwardRef, Module } from '@nestjs/common';
import { EventsModule } from '@/events/events.module';
import { db } from '@/infrastructure/database/database';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { LeaguesModule } from '@/leagues/leagues.module';
import { PlayerStatsModule } from '@/player-stats/player-stats.module';
import { NflModule } from '@/nfl/nfl.module';
import { GolfModule } from '@/golf/golf.module';
import { WorldCupModule } from '@/world-cup/world-cup.module';
import { DatabaseTeamsEntryRepository, TeamsEntryRepository } from '@/teams/teams-entry.repository';
import { TeamsController } from './teams.controller';
import { DatabaseTeamsRepository, TeamsRepository } from './teams.repository';
import { TeamsService } from './teams.service';
import { TeamsGameStrategyRegistry } from './strategies/teams-game-strategy.registry';

@Module({
  controllers: [TeamsController],
  providers: [
    TeamsService,
    TeamsGameStrategyRegistry,
    {
      provide: 'DB_CONNECTION',
      useValue: db,
    },
    {
      provide: TeamsRepository,
      useClass: DatabaseTeamsRepository,
    },
    {
      provide: TeamsEntryRepository,
      useClass: DatabaseTeamsEntryRepository,
    },
  ],
  imports: [DatabaseModule, forwardRef(() => LeaguesModule), PlayerStatsModule, EventsModule, NflModule, GolfModule, WorldCupModule],
  exports: [TeamsService],
})
export class TeamsModule {}
