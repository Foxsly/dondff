import { db } from '@/infrastructure/database/database';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { forwardRef, Module } from '@nestjs/common';
import { TeamsModule } from '@/teams/teams.module';
import { LeaguesController } from './leagues.controller';
import { DatabaseLeaguesRepository, LeaguesRepository } from './leagues.repository';
import { LeaguesService } from './leagues.service';

@Module({
  controllers: [LeaguesController],
  providers: [
    LeaguesService,
    {
      provide: 'DB_CONNECTION',
      useValue: db,
    },
    {
      provide: LeaguesRepository,
      useClass: DatabaseLeaguesRepository,
    },
  ],
  imports: [DatabaseModule, forwardRef(() => TeamsModule)],
  exports: [LeaguesService],
})
export class LeaguesModule {}
