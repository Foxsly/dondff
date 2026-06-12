import { Injectable } from '@nestjs/common';
import { SportLeague } from '@/common/types/sport-league.type';
import { IPlayerStatsStrategy } from './player-stats-strategy.interface';
import { NflPlayerStatsStrategy } from '@/nfl/strategies/nfl-player-stats.strategy';
import { GolfPlayerStatsStrategy } from '@/golf/strategies/golf-player-stats.strategy';
import { WorldCupPlayerStatsStrategy } from '@/world-cup/strategies/world-cup-player-stats.strategy';

@Injectable()
export class PlayerStatsStrategyRegistry {
  private readonly strategies: Map<SportLeague, IPlayerStatsStrategy>;

  constructor(
    nfl: NflPlayerStatsStrategy,
    golf: GolfPlayerStatsStrategy,
    worldCup: WorldCupPlayerStatsStrategy,
  ) {
    this.strategies = new Map<SportLeague, IPlayerStatsStrategy>([
      [SportLeague.NFL, nfl],
      [SportLeague.GOLF, golf],
      [SportLeague.WORLDCUP, worldCup],
    ]);
  }

  get(sport: SportLeague): IPlayerStatsStrategy {
    const strategy = this.strategies.get(sport);
    if (!strategy) {
      throw new Error(`No PlayerStatsStrategy registered for sport: ${sport}`);
    }
    return strategy;
  }
}
