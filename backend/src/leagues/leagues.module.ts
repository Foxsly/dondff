import { db } from '@/infrastructure/database/database';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { Module } from '@nestjs/common';
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
  imports: [DatabaseModule],
  exports: [LeaguesService],
})
export class LeaguesModule {}
