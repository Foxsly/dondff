import { Selectable } from 'kysely';
import { tags } from 'typia';
import { SportLeague } from '@/common/types/sport-league.type';

export interface ILeague {
  leagueId: string & tags.Format<'uuid'>;
  name: string;
  sportLeague: SportLeague;
}

export type League = Selectable<ILeague>;
export type CreateLeagueDto = Omit<ILeague, 'leagueId'>;
export type UpdateLeagueDto = Partial<ILeague>;