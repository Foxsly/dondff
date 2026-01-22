import { FanduelNflProjectionsResponse } from '@/fanduel/entities/fanduel-nfl.entity';
import { PlayerPosition } from '@/player-stats/entities/player-stats.entity';
import { Controller, Query } from '@nestjs/common';
import { FanduelService } from './fanduel.service';
import { TypedRoute, TypedParam } from '@nestia/core';
import { FanduelSport } from './fanduel.projections.config';

@Controller('fanduel')
export class FanduelController {
  constructor(private readonly fanduelService: FanduelService) {}

  @TypedRoute.Get('GOLF/events')
  getGolfEvents() {
    return this.fanduelService.getGolfEvents();
  }

  @TypedRoute.Get('GOLF/slates')
  getGolfSlates() {
    return this.fanduelService.getGolfSlates();
  }

  @TypedRoute.Get(':sport/projections')
  getProjectionsBySport(
      @TypedParam('sport') sport: FanduelSport,
      @Query("slateId") slateId: string,
      @Query("eventId") eventId: string,
  ) {
    return this.fanduelService.getProjectionsBySport(sport, eventId, slateId);
  }

  @TypedRoute.Get('test')
  async getPositionStats() {
    const fP: FanduelNflProjectionsResponse = await this.fanduelService.getProjectionsBySport("NFL");
    let stats: PositionStats[] = [{position: 'RB'}, {position: 'WR'}, {position: 'TE'},];
    stats.forEach(value => {
      let fPP = fP.filter((e) => e.player.position === value.position);
      console.log(value.position, fPP.length);
      value.overTen = fPP.filter((e) => e.fantasy >= 10.0).length
      value.fiveToTen = fPP.filter((e) => e.fantasy >= 5.0 && e.fantasy < 10.0).length
      value.twoToFive = fPP.filter((e) => e.fantasy >= 2.0 && e.fantasy < 5.0).length
      value.oneToTwo = fPP.filter((e) => e.fantasy >= 1.0 && e.fantasy < 2.0).length
      value.underOne = fPP.filter((e) => e.fantasy > 0.0 && e.fantasy < 1.0).length
    })
    return stats;
  }
}

interface PositionStats {
  position: PlayerPosition,
  overTen?: number,
  fiveToTen?: number,
  twoToFive?: number
  oneToTwo?: number,
  underOne?: number
}
