import { Injectable } from '@nestjs/common';
import { FanduelService } from '@/external-providers/fanduel/fanduel.service';
import { EspnService } from '@/external-providers/espn/espn.service';
import { IEventSyncStrategy, EventSyncGroup } from '@/events/strategies/event-sync-strategy.interface';
import { matchesEvent } from '@/golf/golf.util';

@Injectable()
export class GolfEventSyncStrategy implements IEventSyncStrategy {
  constructor(
    private readonly fanduelService: FanduelService,
    private readonly espnService: EspnService,
  ) {}

  async fetchSyncData(): Promise<EventSyncGroup[]> {
    const currentYear = new Date().getFullYear();
    const [fanduelEvents, espnSchedule] = await Promise.all([
      this.fanduelService.getGolfEvents(),
      this.espnService.getPgaSchedule(currentYear),
    ]);

    return fanduelEvents
      .map((fanduelEvent) => {
        const espnMatch = espnSchedule.find((espn) =>
          matchesEvent(fanduelEvent.name, espn.name),
        );
        if (!espnMatch) return null;

        return {
          name: fanduelEvent.name,
          events: [
            {
              externalId: fanduelEvent.id,
              externalSource: 'FANDUEL',
              name: fanduelEvent.name,
              startDate: espnMatch.startDate,
              endDate: espnMatch.endDate,
            },
          ],
        };
      })
      .filter((group): group is EventSyncGroup => group !== null);
  }
}
