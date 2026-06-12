import { Injectable } from '@nestjs/common';
import { ILeagueDefaultsStrategy } from '@/leagues/strategies/league-defaults-strategy.interface';

@Injectable()
export class WorldCupLeagueDefaultsStrategy implements ILeagueDefaultsStrategy {
  getDefaultPositions(): Array<{ position: string; poolSize: number }> {
    return [
      { position: 'GK', poolSize: 48 },
      { position: 'DEF', poolSize: 168 },
      { position: 'MID', poolSize: 240 },
      { position: 'FWD', poolSize: 120 },
    ];
  }
}
