import { Module } from '@nestjs/common';
import { LeaguesService } from './leagues.service';
import { LeaguesController } from './leagues.controller';
import { db } from '@/infrastructure/database/database';
import { DatabaseLeaguesRepository, LeaguesRepository } from './leagues.repository';
import { DatabaseModule } from '@/infrastructure/database/database.module';

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
  imports: [DatabaseModule],
})
export class LeaguesModule {}
