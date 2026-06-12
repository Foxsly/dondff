import { Injectable } from '@nestjs/common';
import { EventGroup } from '@/events/entities/event-group.entity';
import { ITeam } from '@/teams/entities/team.entity';
import { ITeamsGameStrategy } from '@/teams/strategies/teams-game-strategy.interface';

@Injectable()
export class NflTeamsGameStrategy implements ITeamsGameStrategy {
  usesSharedPlayerPool(): boolean {
    return false;
  }

  getExcludedPlayerIds(_team: ITeam, _currentPosition: string): Promise<string[]> {
    return Promise.resolve([]);
  }

  getNumberOfCases(eventGroup: EventGroup): number {
    const weekMatch = eventGroup.name.match(/Week\s+(\d+)/);
    if (weekMatch) {
      const weekNumber = parseInt(weekMatch[1], 10);
      if (weekNumber === 20) return 6;
    }
    return 10;
  }

  normalizePlayerName(name: string): string {
    return name;
  }
}
