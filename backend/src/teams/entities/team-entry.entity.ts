import { tags } from 'typia';
import { Selectable } from 'kysely';

export type TeamEntryStatus = 'pending' | 'playing' | 'finished';
export type TeamEntryBoxStatus = 'selected' | 'eliminated' | 'available' | 'reset';
export type TeamEntryOfferStatus = 'accepted' | 'rejected' | 'pending';
export type TeamEntryEventType =
  | 'start'
  | 'reset'
  | 'boxes_generated'
  | 'box_selected'
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

/**
 * Audit columns that exist in the DB but aren't used in business logic
 */
export interface AuditableTable {
  createdAt?: string & tags.Format<'date-time'>;
  updatedAt?: string & tags.Format<'date-time'>;
}

// Audit types (for the future, if needed)
export type TeamEntryTable = ITeamEntry & AuditableTable;
export type TeamEntryAuditTable = ITeamEntryAudit & AuditableTable;
export type TeamEntryOfferTable = ITeamEntryOffer & AuditableTable;
export type TeamEntryEventTable = ITeamEntryEvent & AuditableTable;
