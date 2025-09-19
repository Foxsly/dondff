import { CreateUserDto, User, UserLeagues } from './entities/user.entity';
import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { DB } from '../infrastructure/database/types';

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

// Repository contract
export interface IUsersRepository {
  create(user: CreateUserDto): Promise<User>;
  findAll(): Promise<User[]>;
  findOne(id: string): Promise<User | null>;
  update(id: string, user: Partial<User>): Promise<User | null>;
  remove(id: string): Promise<boolean>;
  getLeagues(userId: string): Promise<UserLeagues[]>;
}

@Injectable()
export class DatabaseUsersRepository implements IUsersRepository {
  constructor(@Inject('DB_CONNECTION') private readonly db: Kysely<DB>) {}

  async create(user: CreateUserDto): Promise<User> {
    return await this.db
      .insertInto('user')
      .values({
        userId: crypto.randomUUID(),
        name: user.name,
        email: user.email,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async findAll(): Promise<User[]> {
    return await this.db.selectFrom('user').selectAll().execute();
  }

  async findOne(id: string): Promise<User | null> {
    const row = await this.db
      .selectFrom('user')
      .selectAll()
      .where('userId', '=', id)
      .executeTakeFirst();

    return row ? row : null;
  }

  async update(id: string, user: Partial<User>): Promise<User | null> {
    const result = await this.db
      .updateTable('user')
      .set({
        ...(user.name && { name: user.name }),
        ...(user.email && { email: user.email }),
      })
      .where('userId', '=', id)
      .returningAll()
      .executeTakeFirst();

    return result ? result : null;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.db.deleteFrom('user').where('userId', '=', id).executeTakeFirst();
    return (result?.numDeletedRows ?? 0n) > 0n;
  }

  async getLeagues(userId: string): Promise<UserLeagues[]> {
    return await this.db
      .selectFrom('leagueUser')
      .innerJoin('league', 'league.leagueId', 'leagueUser.leagueId')
      .select(['leagueUser.leagueId', 'leagueUser.role', 'league.name as leagueName'])
      .where('leagueUser.userId', '=', userId)
      .execute();
  }
}
