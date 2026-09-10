import { Injectable } from '@nestjs/common';
import { SleeperService } from '@/external-providers/sleeper/sleeper.service';
import { IEventSyncStrategy, EventSyncGroup } from '@/events/strategies/event-sync-strategy.interface';

@Injectable()
export class NflEventSyncStrategy implements IEventSyncStrategy {
  constructor(private readonly sleeperService: SleeperService) {}

  async fetchSyncData(): Promise<EventSyncGroup[]> {
    const nflState = await this.sleeperService.getNflState();
    const displayWeek = nflState.week;
    const seasonYear = Number(nflState.season);

    const isPost = nflState.season_type === 'post';
    const sleeperWeek = isPost ? displayWeek - 18 : displayWeek;
    const seasonType = isPost ? 'post' : 'regular';

    const dates = await this.sleeperService.getNflWeekGameDates(
      seasonYear,
      sleeperWeek,
      seasonType,
    );
    if (dates.length === 0) return [];

    const sorted = [...dates].sort();
    const groupName = `NFL Week ${displayWeek}`;

    return [
      {
        name: groupName,
        seasonYear,
        events: [
          {
            externalId: `${seasonYear}-${displayWeek}`,
            externalSource: 'SLEEPER',
            name: groupName,
            startDate: sorted[0],
            endDate: sorted[sorted.length - 1],
          },
        ],
      },
    ];
  }
}