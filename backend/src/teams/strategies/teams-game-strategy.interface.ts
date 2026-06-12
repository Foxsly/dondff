import { EventGroup } from '@/events/entities/event-group.entity';
import { ITeam } from '@/teams/entities/team.entity';

export interface ITeamsGameStrategy {
  usesSharedPlayerPool(): boolean;
  getExcludedPlayerIds(team: ITeam, currentPosition: string): Promise<string[]>;
  getNumberOfCases(eventGroup: EventGroup): number;
  normalizePlayerName(name: string): string;
}
