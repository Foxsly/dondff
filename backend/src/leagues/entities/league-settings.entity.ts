import { Selectable } from 'kysely';
import { tags } from 'typia';

/**
 * League Settings follow the same "rich domain entity" style as other entities
 * (see team-player.entity.ts): an interface + Kysely-friendly type aliases.
 *
 * NOTE:
 * - `positions` is a string[] in the domain entity.
 * - In the database, you will store it as TEXT (JSON string).
 *   Repositories should JSON.stringify/parse when crossing the DB boundary.
 */
export type ScoringType = 'PPR' | 'HALF_PPR' | 'STANDARD';

export interface ILeagueSettings {
  leagueSettingsId: string & tags.Format<'uuid'>;
  leagueId: string & tags.Format<'uuid'>;
  scoringType: ScoringType;
  positions: Array<string> & tags.MinItems<1> & tags.UniqueItems;
  rbPoolSize: number & tags.Minimum<0>;
  wrPoolSize: number & tags.Minimum<0>;
  qbPoolSize: number & tags.Minimum<0>;
  tePoolSize: number & tags.Minimum<0>;
  createdAt: string;
  updatedAt: string;
}

export type LeagueSettings = Selectable<ILeagueSettings>;
export type CreateLeagueSettingsDto = Omit<
  ILeagueSettings,
  'leagueSettingsId' | 'createdAt' | 'updatedAt'
>;
// Append-only: no Update DTO by design. If needed later, introduce a new row instead.
export type UpdateLeagueSettingsDto = never;
export type LeagueSettingsRow = Omit<ILeagueSettings, 'positions'> & {
  positions: string; // JSON string in DB
};
