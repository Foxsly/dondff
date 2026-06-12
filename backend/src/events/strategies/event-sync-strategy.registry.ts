import { Injectable } from '@nestjs/common';
import { SportLeague } from '@/common/types/sport-league.type';
import { IEventSyncStrategy } from './event-sync-strategy.interface';
import { NflEventSyncStrategy } from '@/nfl/strategies/nfl-event-sync.strategy';
import { GolfEventSyncStrategy } from '@/golf/strategies/golf-event-sync.strategy';
import { WorldCupEventSyncStrategy } from '@/world-cup/strategies/world-cup-event-sync.strategy';

@Injectable()
export class EventSyncStrategyRegistry {
  private readonly strategies: Map<SportLeague, IEventSyncStrategy>;

  constructor(
    nfl: NflEventSyncStrategy,
    golf: GolfEventSyncStrategy,
    worldCup: WorldCupEventSyncStrategy,
  ) {
    this.strategies = new Map<SportLeague, IEventSyncStrategy>([
      [SportLeague.NFL, nfl],
      [SportLeague.GOLF, golf],
      [SportLeague.WORLDCUP, worldCup],
    ]);
  }

  get(sport: SportLeague): IEventSyncStrategy {
    const strategy = this.strategies.get(sport);
    if (!strategy) {
      throw new Error(`No EventSyncStrategy registered for sport: ${sport}`);
    }
    return strategy;
  }
}
