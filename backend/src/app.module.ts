import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { EventsModule } from '@/events/events.module';
import { LeaguesModule } from '@/leagues/leagues.module';
import { PlayerStatsModule } from '@/player-stats/player-stats.module';
import { SleeperModule } from '@/external-providers/sleeper/sleeper.module';
import { TeamsModule } from '@/teams/teams.module';
import { UsersModule } from '@/users/users.module';
import { Module } from '@nestjs/common';
import { HealthController } from '@/health/health.controller';
import { ConfigModule } from '@nestjs/config';
import { FanduelModule } from '@/external-providers/fanduel/fanduel.module';
import { EspnModule } from '@/external-providers/espn/espn.module';
import { FifaModule } from './external-providers/fifa/fifa.module';
import { GolfModule } from './golf/golf.module';
import { NflModule } from './nfl/nfl.module';
import { WorldCupModule } from './world-cup/world-cup.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot(),
    UsersModule,
    EventsModule,
    LeaguesModule,
    TeamsModule,
    SleeperModule,
    FanduelModule,
    PlayerStatsModule,
    EspnModule,
    FifaModule,
    NflModule,
    GolfModule,
    WorldCupModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
