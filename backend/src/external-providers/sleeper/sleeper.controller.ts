import type { SleeperNflStatRequest } from '@/external-providers/sleeper/entities/sleeper-nfl.entity';
import { TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { Controller } from '@nestjs/common';
import { SleeperService } from './sleeper.service';

@Controller('sleeper')
export class SleeperController {
  constructor(private readonly sleeperService: SleeperService) {}

  @TypedRoute.Get('state')
  getState() {
    return this.sleeperService.getNflState();
  }

  @TypedRoute.Get('projections/:year/:week')
  getProjections(
    @TypedParam('year') year: number,
    @TypedParam('week') week: number,
    @TypedQuery() query: SleeperNflStatRequest,
  ) {
    return this.sleeperService.getPlayerProjections(query.position, year, week);
  }

  @TypedRoute.Get('stats/:year/:week')
  getStats(
    @TypedParam('year') year: number,
    @TypedParam('week') week: number,
    @TypedQuery() query: SleeperNflStatRequest,
  ) {
    return this.sleeperService.getPlayerStatistics(query.position, year, week);
  }
}
