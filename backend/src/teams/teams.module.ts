import { Module } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { db } from '@/infrastructure/database/database';
import { DatabaseTeamsRepository, TeamsRepository } from './teams.repository';
import { DatabaseModule } from '@/infrastructure/database/database.module';

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
  ],
  imports: [DatabaseModule],
})
export class TeamsModule {}
