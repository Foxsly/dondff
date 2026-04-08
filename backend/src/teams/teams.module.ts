import { forwardRef, Module } from '@nestjs/common';
import { EventsModule } from '@/events/events.module';
import { db } from '@/infrastructure/database/database';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { LeaguesModule } from '@/leagues/leagues.module';
import { PlayerStatsModule } from '@/player-stats/player-stats.module';
import { DatabaseTeamsEntryRepository, TeamsEntryRepository } from '@/teams/teams-entry.repository';
import { TeamsController } from './teams.controller';
import { DatabaseTeamsRepository, TeamsRepository } from './teams.repository';
import { TeamsService } from './teams.service';

@Module({
  controllers: [TeamsController],
  providers: [
    TeamsService,
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
  imports: [DatabaseModule, forwardRef(() => LeaguesModule), PlayerStatsModule, EventsModule],
  exports: [TeamsService],
})
export class TeamsModule {}
