import { League as LeagueEntity } from './entities/league.entity';
import { Inject, Injectable } from '@nestjs/common';
import { Kysely, Selectable } from 'kysely';
import { DB } from '../infrastructure/database/types';
import { CreateLeagueDto } from './dto/create-league.dto';

export const LEAGUES_REPOSITORY = Symbol('LEAGUES_REPOSITORY');

// Repository contract
export interface ILeaguesRepository {
  create(league: CreateLeagueDto): Promise<LeagueEntity>;
  findAll(): Promise<LeagueEntity[]>;
  findOne(id: number): Promise<LeagueEntity | null>;
  update(id: number, league: Partial<LeagueEntity>): Promise<LeagueEntity | null>;
  remove(id: number): Promise<boolean>;
}

// In-memory implementation (great for testing or prototyping)

/* eslint-disable @typescript-eslint/require-await */
export class InMemoryLeaguesRepository implements ILeaguesRepository {
  private leagues: LeagueEntity[] = [];

  async create(league: CreateLeagueDto): Promise<LeagueEntity> {
    const leagueWithId: LeagueEntity = { leagueId: this.leagues.length + 1, ...league };
    this.leagues.push(leagueWithId);
    return leagueWithId;
  }

  async findAll(): Promise<LeagueEntity[]> {
    return this.leagues;
  }

  async findOne(id: number): Promise<LeagueEntity | null> {
    return this.leagues.find((league) => league.leagueId === id) ?? null;
  }

  async update(id: number, league: Partial<LeagueEntity>): Promise<LeagueEntity | null> {
    const index = this.leagues.findIndex((league) => league.leagueId === id);
    if (index === -1) return null;

    this.leagues[index] = { ...this.leagues[index], ...league };
    return this.leagues[index];
  }

  async remove(id: number): Promise<boolean> {
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

  private mapToEntity = (row: Selectable<DB['league']>): LeagueEntity =>
    new LeagueEntity(
      row.leagueId!,
      row.name,
    );

  async create(league: CreateLeagueDto): Promise<LeagueEntity> {
    const result = await this.db
      .insertInto('league')
      .values({
        name: league.name,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return this.mapToEntity(result);
  }

  async findAll(): Promise<LeagueEntity[]> {
    const rows: Selectable<DB['league']>[] = await this.db.selectFrom('league').selectAll().execute();
    return rows.map(this.mapToEntity);
  }

  async findOne(id: number): Promise<LeagueEntity | null> {
    const row = await this.db
      .selectFrom('league')
      .selectAll()
      .where('leagueId', '=', id)
      .executeTakeFirst();

    return row ? this.mapToEntity(row) : null;
  }

  async update(id: number, league: Partial<LeagueEntity>): Promise<LeagueEntity | null> {
    const result = await this.db
      .updateTable('league')
      .set({
        ...(league.name && { name: league.name }),
      })
      .where('leagueId', '=', id)
      .returningAll()
      .executeTakeFirst();

    return result ? this.mapToEntity(result) : null;
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.db.deleteFrom('league').where('leagueId', '=', id).executeTakeFirst();
    return (result?.numDeletedRows ?? 0n) > 0n;
  }
}
