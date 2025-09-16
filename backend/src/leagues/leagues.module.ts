import { Module } from '@nestjs/common';
import { LeaguesService } from './leagues.service';
import { LeaguesController } from './leagues.controller';
import { db } from '../infrastructure/database/database';
import { DatabaseLeaguesRepository, LEAGUES_REPOSITORY } from './leagues.repository';

@Module({
  controllers: [LeaguesController],
  providers: [
    LeaguesService,
    {
      provide: 'DB_CONNECTION',
      useValue: db,
    },
    {
      provide: LEAGUES_REPOSITORY,
      useClass: DatabaseLeaguesRepository,
    },
  ],
})
export class LeaguesModule {}
