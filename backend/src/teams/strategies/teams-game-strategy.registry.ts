import { Injectable } from '@nestjs/common';
import { SportLeague } from '@/common/types/sport-league.type';
import { ITeamsGameStrategy } from './teams-game-strategy.interface';
import { NflTeamsGameStrategy } from '@/nfl/strategies/nfl-teams-game.strategy';
import { GolfTeamsGameStrategy } from '@/golf/strategies/golf-teams-game.strategy';
import { WorldCupTeamsGameStrategy } from '@/world-cup/strategies/world-cup-teams-game.strategy';

@Injectable()
export class TeamsGameStrategyRegistry {
  private readonly strategies: Map<SportLeague, ITeamsGameStrategy>;

  constructor(
    nfl: NflTeamsGameStrategy,
    golf: GolfTeamsGameStrategy,
    worldCup: WorldCupTeamsGameStrategy,
  ) {
    this.strategies = new Map<SportLeague, ITeamsGameStrategy>([
      [SportLeague.NFL, nfl],
      [SportLeague.GOLF, golf],
      [SportLeague.WORLDCUP, worldCup],
    ]);
  }

  get(sport: SportLeague): ITeamsGameStrategy {
    const strategy = this.strategies.get(sport);
    if (!strategy) {
      throw new Error(`No TeamsGameStrategy registered for sport: ${sport}`);
    }
    return strategy;
  }
}
