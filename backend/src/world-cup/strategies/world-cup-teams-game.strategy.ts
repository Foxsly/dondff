import { Injectable } from '@nestjs/common';
import { EventGroup } from '@/events/entities/event-group.entity';
import { ITeam } from '@/teams/entities/team.entity';
import { ITeamsGameStrategy } from '@/teams/strategies/teams-game-strategy.interface';

@Injectable()
export class WorldCupTeamsGameStrategy implements ITeamsGameStrategy {
  usesSharedPlayerPool(): boolean {
    return false;
  }

  getExcludedPlayerIds(_team: ITeam, _currentPosition: string): Promise<string[]> {
    return Promise.resolve([]);
  }

  getNumberOfCases(_eventGroup: EventGroup): number {
    return 10;
  }

  normalizePlayerName(name: string): string {
    return name;
  }
}
