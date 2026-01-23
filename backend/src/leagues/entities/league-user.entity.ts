import { tags } from 'typia';
import { Selectable } from 'kysely';

export interface ILeagueUser {
  leagueId: string & tags.Format<'uuid'>;
  userId: string & tags.Format<'uuid'>;
  role: string;
}

export type LeagueUser = Selectable<ILeagueUser>;
export type AddLeagueUserDto = Omit<ILeagueUser, 'leagueId'>;
export type UpdateLeagueUserDto = Pick<ILeagueUser, 'role'>;