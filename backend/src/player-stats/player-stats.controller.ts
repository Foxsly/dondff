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

  @TypedRoute.Get('projections/:year/:eventGroupId/:position')
  getProjections(
    @TypedParam('year') year: number,
    @TypedParam('eventGroupId') eventGroupId: string,
    @TypedParam('position') position: string,
    @Query('sportLeague') sportLeague?: SportLeague,
  ): Promise<PlayerProjectionResponse> {
    return this.playerStatsService.getPlayerProjections(position, year, eventGroupId, sportLeague);
  }

  @TypedRoute.Get('stats/:year/:eventGroupId/:position')
  getStats(
    @TypedParam('year') year: number,
    @TypedParam('eventGroupId') eventGroupId: string,
    @TypedParam('position') position: string,
    @Query('sportLeague') sportLeague?: SportLeague,
  ): Promise<PlayerStatResponse> {
    return this.playerStatsService.getPlayerStatistics(position, year, eventGroupId, sportLeague);
  }
}
