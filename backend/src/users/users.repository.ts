import { CreateUserDto, User, UserLeagues } from './entities/user.entity';
import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { DB } from '@/infrastructure/database/types';
import { DB_PROVIDER } from '@/infrastructure/database/database.module';

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

export abstract class UsersRepository {
  abstract create(user: CreateUserDto): Promise<User>;
  abstract findAll(): Promise<User[]>;
  abstract findOne(id: string): Promise<User | null>;
  abstract update(id: string, user: Partial<User>): Promise<User | null>;
  abstract remove(id: string): Promise<boolean>;
  abstract getLeagues(userId: string): Promise<UserLeagues[]>;
}

@Injectable()
export class DatabaseUsersRepository extends UsersRepository {
  constructor(@Inject(DB_PROVIDER) private readonly db: Kysely<DB>) {
    super();
  }

  async create(user: CreateUserDto): Promise<User> {
    return await this.db
      .insertInto('dondUser')
      .values({
        userId: crypto.randomUUID(),
        name: user.name,
        email: user.email,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async findAll(): Promise<User[]> {
    return await this.db.selectFrom('dondUser').selectAll().execute();
  }

  async findOne(id: string): Promise<User | null> {
    const row = await this.db
      .selectFrom('dondUser')
      .selectAll()
      .where('userId', '=', id)
      .executeTakeFirst();

    return row ? row : null;
  }

  async update(id: string, user: Partial<User>): Promise<User | null> {
    const result = await this.db
      .updateTable('dondUser')
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
    const result = await this.db.deleteFrom('dondUser').where('userId', '=', id).executeTakeFirst();
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
