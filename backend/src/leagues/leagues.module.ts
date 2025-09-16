import { Module } from '@nestjs/common';
import { LeaguesService } from './leagues.service';
import { LeaguesController } from './leagues.controller';

@Module({
  controllers: [LeaguesController],
  providers: [LeaguesService],
})
export class LeaguesModule {}
