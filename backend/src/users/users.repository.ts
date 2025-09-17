import { CreateUserDto, User } from './entities/user.entity';
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
}

// In-memory implementation (great for testing or prototyping)

/* eslint-disable @typescript-eslint/require-await */
export class InMemoryUsersRepository implements IUsersRepository {
  private users: User[] = [];

  async create(user: CreateUserDto): Promise<User> {
    const userWithId: User = { userId: crypto.randomUUID(), ...user };
    this.users.push(userWithId);
    return userWithId;
  }

  async findAll(): Promise<User[]> {
    return this.users;
  }

  async findOne(id: string): Promise<User | null> {
    return this.users.find((u) => u.userId === id) ?? null;
  }

  async update(id: string, user: Partial<User>): Promise<User | null> {
    const index = this.users.findIndex((u) => u.userId === id);
    if (index === -1) return null;

    this.users[index] = { ...this.users[index], ...user };
    return this.users[index];
  }

  async remove(id: string): Promise<boolean> {
    const index = this.users.findIndex((u) => u.userId === id);
    if (index === -1) return false;

    this.users.splice(index, 1);
    return true;
  }

  // Helper for tests
  seed(users: User[]) {
    this.users = users;
  }
}
/* eslint-enable @typescript-eslint/require-await */

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
    const row  = await this.db
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
}
