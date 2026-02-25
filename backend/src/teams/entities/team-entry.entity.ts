import { AuditableTable } from '@/infrastructure/entities/auditable.table';
import { PlayerTeams } from '@/player-stats/entities/player-stats.entity';
import { Selectable } from 'kysely';
import { tags } from 'typia';

export type TeamEntryStatus = 'pending' | 'playing' | 'finished';
export type TeamEntryBoxStatus = 'selected' | 'eliminated' | 'available' | 'swapped' | 'reset';
export type TeamEntryOfferStatus = 'accepted' | 'rejected' | 'pending';
export type TeamEntryAuditFinalDecision = 'keep' | 'swap';
export type TeamEntryEventType =
  | 'start'
  | 'reset'
  | 'boxes_generated'
  | 'box_selected'
  | 'box_auto_selected'
  | 'box_eliminated'
  | 'offer_made'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'end';

/**
 * Represents the 'entry' for a team once a game has been initiated
 */
export interface ITeamEntry {
  teamEntryId: string & tags.Format<'uuid'>;
  teamId: string & tags.Format<'uuid'>;
  position: string & tags.MinLength<1>;
  leagueSettingsId: string & tags.Format<'uuid'>;
  resetCount: number;
  selectedBox: number | null;
  status: TeamEntryStatus;
}

/**
 * Represents a snapshot of a single box for a given reset_number on a team_entry.
 */
export interface ITeamEntryAudit {
  auditId: string & tags.Format<'uuid'>;
  teamEntryId: string & tags.Format<'uuid'>;
  resetNumber: number;
  boxNumber: number;
  playerId: string & tags.MinLength<1>;
  playerName: string & tags.MinLength<1>;
  projectedPoints: number;
  injuryStatus: string | null;
  boxStatus: TeamEntryBoxStatus;
}

/**
 * Represents a concrete offer made for a team_entry, tied to a specific player.
 */
export interface ITeamEntryOffer {
  offerId: string & tags.Format<'uuid'>;
  teamEntryId: string & tags.Format<'uuid'>;
  playerId: string & tags.MinLength<1>;
  playerName: string & tags.MinLength<1>;
  injuryStatus: string | null;
  projectedPoints: number;
  status: TeamEntryOfferStatus;
}

/**
 * Append-only event stream for a team_entry, used for auditability and replay.
 */
export interface ITeamEntryEvent {
  eventId: string & tags.Format<'uuid'>;
  teamEntryId: string & tags.Format<'uuid'>;
  eventType: TeamEntryEventType;
  resetNumber: number;
  round: number | null;
  /**
   * JSON-encoded payload containing event-specific details.
   * For PostgreSQL deployments this may be mapped to json/jsonb via Kysely,
   * but at the entity layer we treat it as a string.
   */
  payload: string | null;
}

export type TeamEntry = Selectable<ITeamEntry>;
export type TeamEntryAudit = Selectable<ITeamEntryAudit>;
export type TeamEntryOffer = Selectable<ITeamEntryOffer>;
export type TeamEntryEvent = Selectable<ITeamEntryEvent>;

// Audit types (for the future, if needed)
export type TeamEntryTable = ITeamEntry & AuditableTable;
export type TeamEntryAuditTable = ITeamEntryAudit & AuditableTable;
export type TeamEntryOfferTable = ITeamEntryOffer & AuditableTable;
export type TeamEntryEventTable = ITeamEntryEvent & AuditableTable;

/**
 * Lightweight metadata for a team-entry “case set” used by
 * GET /teams/:teamId/cases.
 *
 * This is intentionally derived from the core entity so that
 * changes to ITeamEntry propagate here automatically.
 */
export type TeamEntryCasesMetaDto = Pick<
  ITeamEntry,
  'teamEntryId' | 'teamId' | 'position' | 'leagueSettingsId' | 'resetCount' | 'status'
>;

/**
 * A single case “box” as exposed to the API layer. Includes player details if the box is eliminated.
 *
 * NOTE: This only exposes structural information about the box
 * (its number and status), not the underlying player mapping.
 * That mapping lives only in the audit rows and the server-side
 * game logic, to prevent front-end cheating.
 */
export type TeamEntryCaseBoxDto = Pick<ITeamEntryAudit, 'boxNumber' | 'boxStatus'> &
  Partial<Pick<ITeamEntryAudit, 'boxNumber' | 'playerId' | 'playerName' | 'projectedPoints'>>;

/**
 * Player summary used when building the “players in cases” list
 * for the UI. This is derived from the audit rows but deliberately
 * omits boxNumber so the client cannot infer which player is in
 * which case.
 */
export type TeamEntryCasePlayerDto = Pick<
  ITeamEntryAudit,
  'playerId' | 'playerName' | 'projectedPoints' | 'injuryStatus' | 'boxStatus'
> & { matchup: PlayerTeams };

/**
 * Combined DTO shape returned by GET /teams/:teamId/cases.
 */
export interface TeamEntryCasesResponseDto extends TeamEntryCasesMetaDto {
  boxes: TeamEntryCaseBoxDto[];
  players: TeamEntryCasePlayerDto[];
}

/**
 * Accepted: contains the accepted offer and all boxes
 * Rejected: contains the new offer and eliminated boxes
 * offer will be absent when returning the last two cases (keep/swap choice)
 */
export interface TeamEntryOfferResponseDto {
  offer?: PlayerOfferDto;
  boxes: ITeamEntryAudit[];
}

/**
 * DTO shape for the final keep/swap response
 * boxes: all boxes and player data
 */
export interface TeamEntryFinalResponseDto {
  boxes: ITeamEntryAudit[];
}

export interface TeamEntryAuditFinalDecisionInputDto {
  decision: TeamEntryAuditFinalDecision;
  position: string & tags.MinLength<1>;
}

export type PlayerOfferDto = ITeamEntryOffer & { matchup: PlayerTeams };