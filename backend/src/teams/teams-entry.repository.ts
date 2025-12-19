import { DB_PROVIDER } from '@/infrastructure/database/database.module';
import { DB } from '@/infrastructure/database/types';
import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import {
  ITeamEntry,
  ITeamEntryAudit,
  ITeamEntryEvent,
  ITeamEntryOffer,
  TeamEntry,
  TeamEntryAudit,
  TeamEntryEvent,
  TeamEntryOffer,
  TeamEntryOfferStatus,
  TeamEntryStatus,
} from './entities/team-entry.entity';

/**
 * This is intentionally separate from TeamsRepository to keep the team aggregate
 * (roster, membership, etc.) distinct from the game / entry lifecycle and its audit trail.
 */
export abstract class TeamsEntryRepository {
  abstract createEntry(teamId: string, position: string, leagueSettingsId: string): Promise<ITeamEntry>;

  abstract findEntryById(teamEntryId: string): Promise<ITeamEntry | null>;

  abstract findLatestEntryForTeamPosition(teamId: string, position: string): Promise<ITeamEntry | null>;

  abstract updateEntry(
    teamEntryId: string,
    patch: Partial<Pick<ITeamEntry, 'selectedBox' | 'status' | 'resetCount'>>,
  ): Promise<ITeamEntry | null>;

  abstract insertAuditSnapshots(
    snapshots: Array<Omit<ITeamEntryAudit, 'auditId'>>,
  ): Promise<ITeamEntryAudit[]>;

  abstract createOffer(
    offer: Omit<ITeamEntryOffer, 'offerId'>,
  ): Promise<ITeamEntryOffer>;

  abstract updateOfferStatus(
    offerId: string,
    status: TeamEntryOfferStatus,
  ): Promise<ITeamEntryOffer | null>;

  abstract appendEvent(event: Omit<ITeamEntryEvent, 'eventId'>): Promise<ITeamEntryEvent>;

  abstract listEventsForEntry(teamEntryId: string): Promise<ITeamEntryEvent[]>;

  abstract findCurrentAuditsForEntry(teamEntryId: string): Promise<ITeamEntryAudit[]>;

  abstract getCurrentOffer(teamEntryId: string): Promise<ITeamEntryOffer | null>;

  abstract getOffers(teamEntryId: string, status?: TeamEntryOfferStatus): Promise<ITeamEntryOffer[]>;
}

@Injectable()
export class DatabaseTeamsEntryRepository extends TeamsEntryRepository {
  constructor(@Inject(DB_PROVIDER) private readonly db: Kysely<DB>) {
    super();
  }

  async createEntry(teamId: string, position: string, leagueSettingsId: string): Promise<ITeamEntry> {
    const row = await this.db
      .insertInto('teamEntry')
      .values({
        teamEntryId: crypto.randomUUID(),
        teamId,
        position,
        leagueSettingsId,
        resetCount: 0,
        selectedBox: null,
        status: 'pending' as TeamEntryStatus,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return row as TeamEntry;
  }

  async findEntryById(teamEntryId: string): Promise<ITeamEntry | null> {
    const row = await this.db
      .selectFrom('teamEntry')
      .selectAll()
      .where('teamEntryId', '=', teamEntryId)
      .executeTakeFirst();

    return (row as TeamEntry | undefined) ?? null;
  }

  async findLatestEntryForTeamPosition(teamId: string, position: string): Promise<ITeamEntry | null> {
    const row = await this.db
      .selectFrom('teamEntry')
      .selectAll()
      .where('teamId', '=', teamId)
      .where('position', '=', position)
      .orderBy('resetCount', 'desc')
      .executeTakeFirst();

    return (row as TeamEntry | undefined) ?? null;
  }

  async updateEntry(
    teamEntryId: string,
    entry: Partial<Pick<ITeamEntry, 'selectedBox' | 'status' | 'resetCount'>>,
  ): Promise<ITeamEntry | null> {
    const row = await this.db
      .updateTable('teamEntry')
      .set({
        ...(entry.selectedBox !== undefined && { selectedBox: entry.selectedBox }),
        ...(entry.status !== undefined && { status: entry.status }),
        ...(entry.resetCount !== undefined && { resetCount: entry.resetCount }),
      })
      .where('teamEntryId', '=', teamEntryId)
      .returningAll()
      .executeTakeFirst();

    return (row as TeamEntry | undefined) ?? null;
  }

  async insertAuditSnapshots(
    snapshots: Array<Omit<ITeamEntryAudit, 'auditId'>>,
  ): Promise<ITeamEntryAudit[]> {
    if (!snapshots.length) {
      return [];
    }

    const rowsToInsert = snapshots.map((snapshot) => ({
      ...snapshot,
      auditId: crypto.randomUUID(),
    }));

    const rows = await this.db
      .insertInto('teamEntryAudit')
      .values(rowsToInsert)
      .returningAll()
      .execute();

    return rows as TeamEntryAudit[];
  }

  async createOffer(
    offer: Omit<ITeamEntryOffer, 'offerId'>,
  ): Promise<ITeamEntryOffer> {
    const row = await this.db
      .insertInto('teamEntryOffer')
      .values({
        ...offer,
        offerId: crypto.randomUUID(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return row as TeamEntryOffer;
  }

  async updateOfferStatus(
    offerId: string,
    status: TeamEntryOfferStatus,
  ): Promise<ITeamEntryOffer | null> {
    const row = await this.db
      .updateTable('teamEntryOffer')
      .set({ status })
      .where('offerId', '=', offerId)
      .returningAll()
      .executeTakeFirst();

    return (row as TeamEntryOffer | undefined) ?? null;
  }

  async appendEvent(event: Omit<ITeamEntryEvent, 'eventId'>): Promise<ITeamEntryEvent> {
    const row = await this.db
      .insertInto('teamEntryEvent')
      .values({
        eventId: crypto.randomUUID(),
        ...event,
        payload: event.payload != null ? JSON.stringify(event.payload) : null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return row as TeamEntryEvent;
  }

  async listEventsForEntry(teamEntryId: string): Promise<ITeamEntryEvent[]> {
    const rows = await this.db
      .selectFrom('teamEntryEvent')
      .selectAll()
      .where('teamEntryId', '=', teamEntryId)
      .orderBy('resetNumber', 'asc')
      .execute();

    return rows as TeamEntryEvent[];
  }

  async findCurrentAuditsForEntry(teamEntryId: string): Promise<ITeamEntryAudit[]> {
    const rows = await this.db
      .selectFrom('teamEntryAudit')
      .innerJoin('teamEntry', 'teamEntry.teamEntryId', 'teamEntryAudit.teamEntryId',)
      .selectAll('teamEntryAudit')
      .where('teamEntryAudit.teamEntryId', '=', teamEntryId)
      .whereRef('teamEntryAudit.resetNumber', '=', 'teamEntry.resetCount',)
      .orderBy('teamEntryAudit.boxNumber', 'asc')
      .execute();

    return rows as ITeamEntryAudit[];
  }

  async getCurrentOffer(teamEntryId: string): Promise<ITeamEntryOffer | null> {
    const row = await this.db
      .selectFrom('teamEntryOffer')
      .selectAll()
      .where('teamEntryId', '=', teamEntryId)
      .where('status', '=', 'pending' as TeamEntryOfferStatus)
      .limit(1)
      .executeTakeFirst();

    return row ? row : null;
  }

  async getOffers(teamEntryId: string, status?: TeamEntryOfferStatus): Promise<ITeamEntryOffer[]> {
    let query = this.db
      .selectFrom('teamEntryOffer')
      .selectAll()
      .where('teamEntryId', '=', teamEntryId);

    if (status !== undefined) {
      query = query.where('status', '=', status);
    }

    const rows = await query
      .orderBy('createdAt', 'desc')
      .execute();

    return rows as TeamEntryOffer[];
  }
}
