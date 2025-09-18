import { CreateLeagueDto, League, League as LeagueEntity } from './entities/league.entity';
import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { DB } from '../infrastructure/database/types';

export const LEAGUES_REPOSITORY = Symbol('LEAGUES_REPOSITORY');

// Repository contract
export interface ILeaguesRepository {
  create(league: CreateLeagueDto): Promise<LeagueEntity>;
  findAll(): Promise<LeagueEntity[]>;
  findOne(id: string): Promise<League | null>;
  update(id: string, league: Partial<League>): Promise<League | null>;
  remove(id: string): Promise<boolean>;
}

// In-memory implementation (great for testing or prototyping)

/* eslint-disable @typescript-eslint/require-await */
export class InMemoryLeaguesRepository implements ILeaguesRepository {
  private leagues: LeagueEntity[] = [];

  async create(league: CreateLeagueDto): Promise<LeagueEntity> {
    const leagueWithId: LeagueEntity = { leagueId: crypto.randomUUID(), ...league };
    this.leagues.push(leagueWithId);
    return leagueWithId;
  }

  async findAll(): Promise<LeagueEntity[]> {
    return this.leagues;
  }

  async findOne(id: string): Promise<League | null> {
    return this.leagues.find((league) => league.leagueId === id) ?? null;
  }

  async update(id: string, league: Partial<League>): Promise<League | null> {
    const index = this.leagues.findIndex((league) => league.leagueId === id);
    if (index === -1) return null;

    this.leagues[index] = { ...this.leagues[index], ...league };
    return this.leagues[index];
  }

  async remove(id: string): Promise<boolean> {
    const index = this.leagues.findIndex((league) => league.leagueId === id);
    if (index === -1) return false;

    this.leagues.splice(index, 1);
    return true;
  }

  // Helper for tests
  seed(leagues: LeagueEntity[]) {
    this.leagues = leagues;
  }
}
/* eslint-enable @typescript-eslint/require-await */

@Injectable()
export class DatabaseLeaguesRepository implements ILeaguesRepository {
  constructor(@Inject('DB_CONNECTION') private readonly db: Kysely<DB>) {}

  async create(league: CreateLeagueDto): Promise<LeagueEntity> {
    return await this.db
      .insertInto('league')
      .values({
        leagueId: crypto.randomUUID(),
        name: league.name,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async findAll(): Promise<LeagueEntity[]> {
    return await this.db.selectFrom('league').selectAll().execute();
  }

  async findOne(id: string): Promise<League | null> {
    const row = await this.db
      .selectFrom('league')
      .selectAll()
      .where('leagueId', '=', id)
      .executeTakeFirst();

    return row ? row : null;
  }

  async update(id: string, league: Partial<League>): Promise<League | null> {
    const result = await this.db
      .updateTable('league')
      .set({
        ...(league.name && { name: league.name }),
      })
      .where('leagueId', '=', id)
      .returningAll()
      .executeTakeFirst();

    return result ? result : null;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.db.deleteFrom('league').where('leagueId', '=', id).executeTakeFirst();
    return (result?.numDeletedRows ?? 0n) > 0n;
  }
}
