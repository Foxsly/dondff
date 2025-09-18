import { tags } from 'typia';
import { Selectable } from 'kysely';

export interface ITeam {
  teamId: string & tags.Format<'uuid'>;
  leagueId: string & tags.Format<'uuid'>;
  userId: string & tags.Format<'uuid'>;
  seasonYear: number & tags.Minimum<2020>;
  week: number & tags.Minimum<1> & tags.Maximum<25>;
  position: string & tags.Pattern<'^(QB|RB|WR|TE)$'>;
  playerId: number;
  playerName: string;
}

export type Team = Selectable<ITeam>;
export type CreateTeamDto = Omit<ITeam, 'teamId'>;
export type UpdateTeamDto = Partial<ITeam>;
