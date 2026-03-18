import {
  PlayerProjectionResponse,
  PlayerStatResponse,
} from '@/player-stats/entities/player-stats.entity';
import { Controller, Query } from '@nestjs/common';
import { PlayerStatsService } from './player-stats.service';
import { TypedParam, TypedRoute } from '@nestia/core';
import type { SportLeague } from '@/leagues/entities/league.entity';

@Controller('players')
export class PlayerStatsController {
  constructor(private readonly playerStatsService: PlayerStatsService) {}

  @TypedRoute.Get('projections/:year/:week/:position')
  getProjections(
    @TypedParam('year') year: number,
    @TypedParam('week') week: number,
    @TypedParam('position') position: string,
    @Query('sportLeague') sportLeague?: SportLeague,
  ): Promise<PlayerProjectionResponse> {
    return this.playerStatsService.getPlayerProjections(position, year, week, sportLeague);
  }

  @TypedRoute.Get('stats/:year/:week/:position')
  getStats(
    @TypedParam('year') year: number,
    @TypedParam('week') week: number,
    @TypedParam('position') position: string,
  ): Promise<PlayerStatResponse> {
    return this.playerStatsService.getPlayerStatistics(position, year, week);
  }
}
