import { Selectable } from 'kysely';
import { tags } from 'typia';

export interface ILeague {
  leagueId: string & tags.Format<'uuid'>;
  name: string;
  sportLeague: SportLeague;
}

export type League = Selectable<ILeague>;
export type CreateLeagueDto = Omit<ILeague, 'leagueId'>;
export type UpdateLeagueDto = Partial<ILeague>;
export type SportLeague = 'NFL' | 'GOLF' | 'NBA' | 'NHL' | 'MLB';