import { Injectable } from '@nestjs/common';
import { FifaService } from '@/external-providers/fifa/fifa.service';
import { IEventSyncStrategy, EventSyncGroup } from '@/events/strategies/event-sync-strategy.interface';

const WORLD_CUP_STAGE_NAMES: Record<string, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  F: 'Final',
};

@Injectable()
export class WorldCupEventSyncStrategy implements IEventSyncStrategy {
  constructor(private readonly fifaService: FifaService) {}

  async fetchSyncData(): Promise<EventSyncGroup[]> {
    const rounds = await this.fifaService.getRounds();
    const groupMap = new Map<string, EventSyncGroup>();

    for (const round of rounds) {
      for (const match of round.tournaments) {
        const externalEventId = `WC-${round.id}-${match.id}`;
        const groupName = this.buildGroupName(round.stage, round.id);

        let group = groupMap.get(groupName);
        if (!group) {
          group = { name: groupName, events: [] };
          groupMap.set(groupName, group);
        }

        group.events.push({
          externalId: externalEventId,
          externalSource: 'FIFA',
          name: `${match.homeSquadName} vs ${match.awaySquadName}`,
          startDate: match.date,
          endDate: match.date,
        });
      }
    }

    return Array.from(groupMap.values());
  }

  private buildGroupName(stage: string, roundId: number): string {
    if (stage === 'GROUP') {
      return `World Cup Group Stage – Matchday ${roundId}`;
    }
    const name = WORLD_CUP_STAGE_NAMES[stage];
    return name
      ? `World Cup Knockout Stage – ${name}`
      : `World Cup Stage ${stage}`;
  }
}
