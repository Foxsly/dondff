import { CreateLeagueDto, League, League as LeagueEntity } from './entities/league.entity';
import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { DB } from '../infrastructure/database/types';
import { ILeagueUser } from './entities/league-user.entity';

export const LEAGUES_REPOSITORY = Symbol('LEAGUES_REPOSITORY');

// Repository contract
export interface ILeaguesRepository {
  create(league: CreateLeagueDto): Promise<LeagueEntity>;
  findAll(): Promise<LeagueEntity[]>;
  findOne(id: string): Promise<League | null>;
  update(id: string, league: Partial<League>): Promise<League | null>;
  remove(id: string): Promise<boolean>;
  findLeagueUsers(id: string): Promise<ILeagueUser[]>;
}

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

  async findLeagueUsers(id: string): Promise<ILeagueUser[]> {
    return await this.db.selectFrom("leagueUser").selectAll().where('leagueId', '=', id).execute();
  }
}
