import { tags } from 'typia';
import { Selectable } from 'kysely';
import { ITeamPlayer } from './team-player.entity';

export interface ITeam {
  teamId: string & tags.Format<'uuid'>;
  leagueId: string & tags.Format<'uuid'>;
  userId: string & tags.Format<'uuid'>;
  seasonYear: number & tags.Minimum<2020>;
  week: number & tags.Minimum<1> & tags.Maximum<25>;
  players: ITeamPlayer[];
}

export type Team = Selectable<Omit<ITeam, 'players'>>;
export type CreateTeamDto = Omit<ITeam, 'teamId' | 'players'>;
export type UpdateTeamDto = Partial<Omit<ITeam, 'players'>>;
