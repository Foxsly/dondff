import { Injectable } from '@nestjs/common';
import { SleeperService } from '@/external-providers/sleeper/sleeper.service';
import { IEventSyncStrategy, EventSyncGroup } from '@/events/strategies/event-sync-strategy.interface';

@Injectable()
export class NflEventSyncStrategy implements IEventSyncStrategy {
  constructor(private readonly sleeperService: SleeperService) {}

  async fetchSyncData(): Promise<EventSyncGroup[]> {
    const nflState = await this.sleeperService.getNflState();
    const weekNumber = nflState.week;
    const seasonYear = Number(nflState.season);
    const externalEventId = `${seasonYear}-${weekNumber}`;
    const groupName = `NFL Week ${weekNumber}`;

    return [
      {
        name: groupName,
        events: [
          {
            externalId: externalEventId,
            externalSource: 'SLEEPER',
            name: groupName,
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
          },
        ],
      },
    ];
  }
}
