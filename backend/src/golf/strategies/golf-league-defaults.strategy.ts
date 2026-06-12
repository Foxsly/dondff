import { Injectable } from '@nestjs/common';
import { ILeagueDefaultsStrategy } from '@/leagues/strategies/league-defaults-strategy.interface';

@Injectable()
export class GolfLeagueDefaultsStrategy implements ILeagueDefaultsStrategy {
  getDefaultPositions(): Array<{ position: string; poolSize: number }> {
    return [
      { position: 'GOLF_PLAYER_1', poolSize: 150 },
      { position: 'GOLF_PLAYER_2', poolSize: 150 },
      { position: 'GOLF_PLAYER_3', poolSize: 150 },
    ];
  }
}
