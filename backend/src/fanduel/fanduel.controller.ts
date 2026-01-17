import { FanduelProjectionsResponse, PlayerPosition } from '@/fanduel/entities/fanduel.entity';
import { Controller } from '@nestjs/common';
import { FanduelService } from './fanduel.service';
import { TypedRoute } from '@nestia/core';

@Controller('fanduel')
export class FanduelController {
  constructor(private readonly fanduelService: FanduelService) {}

  @TypedRoute.Get('test')
  async getState() {
    const fP:FanduelProjectionsResponse = await this.fanduelService.getFanduelProjections();
    let stats: PositionStats[] =
      [
        {position: 'RB'},
        {position: 'WR'},
        {position: 'TE'},
        ];
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
