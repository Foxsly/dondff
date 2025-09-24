import { Controller } from '@nestjs/common';
import { SleeperService } from './sleeper.service';
import { TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import * as sleeper from './entities/sleeper.entity';

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
    @TypedQuery() query: sleeper.SleeperStatRequest,
  ) {
    return this.sleeperService.getPlayerProjections(query.position, year, week);
  }

  @TypedRoute.Get('stats/:year/:week')
  getStats(
    @TypedParam('year') year: number,
    @TypedParam('week') week: number,
    @TypedQuery() query: sleeper.SleeperStatRequest,
  ) {
    return this.sleeperService.getPlayerStatistics(query.position, year, week);
  }
}
