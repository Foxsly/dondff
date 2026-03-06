import { tags } from 'typia';
import { Selectable } from 'kysely';

export interface ILeague {
  leagueId: string & tags.Format<'uuid'>;
  name: string;
  sport: string;
}

export type League = Selectable<ILeague>;
export type CreateLeagueDto = Omit<ILeague, 'leagueId'>;
export type UpdateLeagueDto = Partial<ILeague>;