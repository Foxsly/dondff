import { Module } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { db } from '../infrastructure/database/database';
import { DatabaseTeamsRepository, TEAMS_REPOSITORY } from './teams.repository';

@Module({
  controllers: [TeamsController],
  providers: [
    TeamsService,
    {
      provide: 'DB_CONNECTION',
      useValue: db,
    },
    {
      provide: TEAMS_REPOSITORY,
      useClass: DatabaseTeamsRepository,
    },
  ],
})
export class TeamsModule {}
