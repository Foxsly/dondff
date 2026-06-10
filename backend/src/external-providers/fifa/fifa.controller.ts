import { Controller } from '@nestjs/common';
import { FifaService } from './fifa.service';
import { TypedParam, TypedRoute } from '@nestia/core';

@Controller('fifa')
export class FifaController {
  constructor(private readonly fifaService: FifaService) {}

  @TypedRoute.Get('rounds')
  getRounds() {
    return this.fifaService.getRounds();
  }

  @TypedRoute.Get('players')
  getPlayers() {
    return this.fifaService.getPlayers();
  }

  @TypedRoute.Get('squads')
  getSquads() {
    return this.fifaService.getSquads();
  }

  @TypedRoute.Get('rounds/:roundId/projections')
  getRoundProjections(
    @TypedParam('roundId') roundId: number,
  ) {
    return this.fifaService.getRoundProjections(roundId);
  }
}
