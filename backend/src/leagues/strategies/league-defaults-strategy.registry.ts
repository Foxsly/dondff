import { Injectable } from '@nestjs/common';
import { SportLeague } from '@/common/types/sport-league.type';
import { ILeagueDefaultsStrategy } from './league-defaults-strategy.interface';
import { NflLeagueDefaultsStrategy } from '@/nfl/strategies/nfl-league-defaults.strategy';
import { GolfLeagueDefaultsStrategy } from '@/golf/strategies/golf-league-defaults.strategy';
import { WorldCupLeagueDefaultsStrategy } from '@/world-cup/strategies/world-cup-league-defaults.strategy';

@Injectable()
export class LeagueDefaultsStrategyRegistry {
  private readonly strategies: Map<SportLeague, ILeagueDefaultsStrategy>;

  constructor(
    nfl: NflLeagueDefaultsStrategy,
    golf: GolfLeagueDefaultsStrategy,
    worldCup: WorldCupLeagueDefaultsStrategy,
  ) {
    this.strategies = new Map<SportLeague, ILeagueDefaultsStrategy>([
      ['NFL', nfl],
      ['GOLF', golf],
      ['WORLDCUP', worldCup],
    ]);
  }

  get(sport: SportLeague): ILeagueDefaultsStrategy {
    const strategy = this.strategies.get(sport);
    if (!strategy) {
      throw new Error(`No LeagueDefaultsStrategy registered for sport: ${sport}`);
    }
    return strategy;
  }
}
