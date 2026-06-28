import { Injectable } from '@nestjs/common';
import { FifaService } from '@/external-providers/fifa/fifa.service';
import { IPlayerStatsStrategy } from '@/player-stats/strategies/player-stats-strategy.interface';
import { IPlayerProjection, IPlayerStats, PlayerPosition } from '@/player-stats/entities/player-stats.entity';
import { EventGroup } from '@/events/entities/event-group.entity';
import { Event } from '@/events/entities/event.entity';

@Injectable()
export class WorldCupPlayerStatsStrategy implements IPlayerStatsStrategy {
  constructor(private readonly fifaService: FifaService) {}

  async getProjections(
    _season: number,
    _eventGroup: EventGroup,
    events: Event[],
    position: string,
  ): Promise<IPlayerProjection[]> {
    const roundId = this.resolveWorldCupRoundId(events);
    const projections = await this.fifaService.getRoundProjections(roundId);
    return projections
      .filter((p) => p.status === 'playing')
      .filter((p) => p.position === position)
      .map((p) => ({
        playerId: `${p.id}`,
        name: this.getWorldCupPlayerName(p.knownName, p.firstName, p.lastName),
        position: p.position as PlayerPosition,
        projectedPoints: p.price,
        injuryStatus: p.status,
        oppTeam: p.opponent,
        team: p.team,
      }));
  }

  async getStatistics(
    _season: number,
    _eventGroup: EventGroup,
    events: Event[],
    position: string,
  ): Promise<IPlayerStats[]> {
    const roundId = this.resolveWorldCupRoundId(events);
    const projections = await this.fifaService.getRoundProjections(roundId);
    return projections
      .filter((p) => p.position === position)
      .map((p) => ({
        playerId: `${p.id}`,
        name: this.getWorldCupPlayerName(p.knownName, p.firstName, p.lastName),
        position: p.position as PlayerPosition,
        points: p.fantasyPoints,
        oppTeam: p.opponent,
        team: p.team,
      }));
  }

  private resolveWorldCupRoundId(events: Event[]): number {
    if (events.length === 0) {
      throw new Error(`No events found for event group`);
    }

    const match = events[0].externalEventId?.match(/^WC-(\d+)-/);
    if (!match) {
      throw new Error(
        `Cannot parse round ID from externalEventId: ${events[0].externalEventId}`,
      );
    }
    return parseInt(match[1], 10);
  }

  private getWorldCupPlayerName(
    knownName: string | null,
    firstName: string,
    lastName: string,
  ): string {
    return knownName ?? `${firstName} ${lastName}`;
  }
}
