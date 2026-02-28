import { AuditableTable } from '@/infrastructure/entities/auditable.table';
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
export type SportLeague = 'NFL' | 'GOLF' | 'NBA' | 'NHL' | 'MLB';

export interface ILeagueSettings {
  leagueSettingsId: string & tags.Format<'uuid'>;
  leagueId: string & tags.Format<'uuid'>;
  scoringType: ScoringType;
  sportLeague: SportLeague;
}

export type LeagueSettings = Selectable<ILeagueSettings>;
export type CreateLeagueSettingsDto = Omit<
  ILeagueSettings,
  'leagueSettingsId' | 'createdAt' | 'updatedAt'
>;
// Append-only: no Update DTO by design. If needed later, introduce a new row instead.
export type UpdateLeagueSettingsDto = never;
export type LeagueSettingsRow = ILeagueSettings;

export interface ILeagueSettingsPosition {
  leagueSettingsId: string & tags.Format<'uuid'>;
  position: string & tags.MinLength<1>;
  poolSize: number & tags.Minimum<0>;
}

//TODO determine if we should be excluding the ID or including it in the DTO
export type CreateLeagueSettingsPositionDto = Omit<
  ILeagueSettingsPosition,
  'leagueSettingsId' | 'createdAt' | 'updatedAt'
>;
export type LeagueSettingsPositionRow = ILeagueSettingsPosition;

// Audit types (for the future, if needed)
export type LeagueSettingsTable = ILeagueSettings & AuditableTable;
export type LeagueSettingsPositionTable = ILeagueSettingsPosition & AuditableTable;
