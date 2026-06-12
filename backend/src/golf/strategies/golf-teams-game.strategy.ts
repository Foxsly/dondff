import { Injectable } from '@nestjs/common';
import { EventGroup } from '@/events/entities/event-group.entity';
import { ITeam } from '@/teams/entities/team.entity';
import { normalizeName } from '@/golf/golf-scoring.util';
import { ITeamsGameStrategy } from '@/teams/strategies/teams-game-strategy.interface';

@Injectable()
export class GolfTeamsGameStrategy implements ITeamsGameStrategy {
  usesSharedPlayerPool(): boolean {
    return true;
  }

  getExcludedPlayerIds(team: ITeam, currentPosition: string): Promise<string[]> {
    return Promise.resolve(
      team.players
        .filter((player) => player.position !== currentPosition)
        .map((player) => player.playerId),
    );
  }

  getNumberOfCases(_eventGroup: EventGroup): number {
    return 10;
  }

  normalizePlayerName(name: string): string {
    return normalizeName(name);
  }
}
