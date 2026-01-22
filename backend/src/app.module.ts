import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { LeaguesModule } from '@/leagues/leagues.module';
import { PlayerStatsModule } from '@/player-stats/player-stats.module';
import { SleeperModule } from '@/sleeper/sleeper.module';
import { TeamsModule } from '@/teams/teams.module';
import { UsersModule } from '@/users/users.module';
import { Module } from '@nestjs/common';
import { HealthController } from '@/health/health.controller';
import { ConfigModule } from '@nestjs/config';
import { FanduelModule } from './fanduel/fanduel.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot(),
    UsersModule,
    LeaguesModule,
    TeamsModule,
    SleeperModule,
    FanduelModule,
    PlayerStatsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
