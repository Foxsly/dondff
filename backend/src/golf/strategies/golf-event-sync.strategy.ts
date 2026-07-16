import { Injectable } from '@nestjs/common';
import { FanduelService } from '@/external-providers/fanduel/fanduel.service';
import { EspnService } from '@/external-providers/espn/espn.service';
import { IEventSyncStrategy, EventSyncGroup } from '@/events/strategies/event-sync-strategy.interface';
import { normalizeEventName } from '@/golf/golf-scoring.util';

/**
 * Maps normalised FanDuel event names to their ESPN equivalents.
 * Keys and values must be in normalised form (lowercase, no punctuation).
 */
const GOLF_EVENT_NAME_ALIASES: Record<string, string> = {
  'the open championship': 'the open',
};

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
          this.matchesEvent(fanduelEvent.name, espn.name),
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

  private matchesEvent(fanduelName: string, espnName: string): boolean {
    const fdNormalised = normalizeEventName(fanduelName);
    const espnNormalised = normalizeEventName(espnName);

    const fdMatch = GOLF_EVENT_NAME_ALIASES[fdNormalised] ?? fdNormalised;

    return espnNormalised.includes(fdMatch) || fdMatch.includes(espnNormalised);
  }
}
