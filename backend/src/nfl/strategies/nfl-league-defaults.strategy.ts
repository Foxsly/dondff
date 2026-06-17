import { Injectable } from '@nestjs/common';
import { ILeagueDefaultsStrategy } from '@/leagues/strategies/league-defaults-strategy.interface';

@Injectable()
export class NflLeagueDefaultsStrategy implements ILeagueDefaultsStrategy {
  getDefaultPositions(): Array<{ position: string; poolSize: number }> {
    return [
      { position: 'RB', poolSize: 64 },
      { position: 'WR', poolSize: 96 },
    ];
  }
}
