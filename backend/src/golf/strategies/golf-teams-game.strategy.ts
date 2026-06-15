import { Injectable } from '@nestjs/common';
import { EventGroup } from '@/events/entities/event-group.entity';
import { IPlayerProjection } from '@/player-stats/entities/player-stats.entity';
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

  async determinePlayerPool(
    projections: IPlayerProjection[],
    team: ITeam,
    position: string,
    poolSize: number,
  ): Promise<IPlayerProjection[]> {
    const excluded = await this.getExcludedPlayerIds(team, position);
    return projections
      .filter(p => !excluded.includes(p.playerId))
      .sort((a, b) => b.projectedPoints - a.projectedPoints)
      .slice(0, poolSize);
  }

  getNumberOfCases(_eventGroup: EventGroup): number {
    return 10;
  }

  normalizePlayerName(name: string): string {
    return normalizeName(name);
  }
}
