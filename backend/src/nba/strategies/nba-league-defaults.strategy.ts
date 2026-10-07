import { Injectable } from '@nestjs/common';
import { ILeagueDefaultsStrategy } from '@/leagues/strategies/league-defaults-strategy.interface';

@Injectable()
export class NbaLeagueDefaultsStrategy implements ILeagueDefaultsStrategy {
  getDefaultPositions(): Array<{ position: string; poolSize: number }> {
    return [
      { position: 'G', poolSize: 64 },
      { position: 'F', poolSize: 64 },
      { position: 'C', poolSize: 32 },
    ];
  }
}
