import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { LeaguesModule } from './leagues/leagues.module';
import { TeamsModule } from './teams/teams.module';
import { ConfigModule } from '@nestjs/config';
import { SleeperModule } from './sleeper/sleeper.module';
import { DatabaseModule } from './infrastructure/database/database.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot(),
    UsersModule,
    LeaguesModule,
    TeamsModule,
    SleeperModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
