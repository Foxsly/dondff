import { CreateLeagueDto, League, ILeague } from './entities/league.entity';
import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { DB } from '@/infrastructure/database/types';
import { AddLeagueUserDto, ILeagueUser, UpdateLeagueUserDto } from './entities/league-user.entity';
import { ITeam } from '@/teams/entities/team.entity';
import { withPlayers } from '@/teams/teams.repository';
import { DB_PROVIDER } from '@/infrastructure/database/database.module';
import {
  CreateLeagueSettingsDto,
  ILeagueSettings,
} from '@/leagues/entities/league-settings.entity';

export abstract class LeaguesRepository {
  abstract createLeague(league: CreateLeagueDto): Promise<ILeague>;
  abstract findAllLeagues(): Promise<ILeague[]>;
  abstract findOneLeague(id: string): Promise<ILeague | null>;
  abstract updateLeague(id: string, league: Partial<League>): Promise<League | null>;
  abstract deleteLeague(id: string): Promise<boolean>;
  abstract findLeagueUsers(id: string): Promise<ILeagueUser[]>;
  abstract addLeagueUser(
    leagueId: string,
    addLeagueUserDto: AddLeagueUserDto,
  ): Promise<ILeagueUser>;
  abstract removeLeagueUser(leagueId: string, userId: string): Promise<boolean>;
  abstract updateLeagueUser(
    leagueId: string,
    userId: string,
    updateLeagueUserDto: UpdateLeagueUserDto,
  ): Promise<ILeagueUser>;
  abstract findLeagueTeams(leagueId: string): Promise<ITeam[]>;
  abstract createLeagueSettings(
    leagueId: string,
    input: CreateLeagueSettingsDto,
  ): Promise<ILeagueSettings>;
  abstract getLatestLeagueSettingsByLeague(leagueId: string): Promise<ILeagueSettings | null>;
  abstract findLeagueSettings(leagueSettingsId: string): Promise<ILeagueSettings | null>;
}

@Injectable()
export class DatabaseLeaguesRepository extends LeaguesRepository {
  constructor(@Inject(DB_PROVIDER) private readonly db: Kysely<DB>) {
    super();
  }

  async createLeague(league: CreateLeagueDto): Promise<ILeague> {
    const row = await this.db
      .insertInto('league')
      .values({
        leagueId: crypto.randomUUID(),
        name: league.name,
        sport: league.sport,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return row as ILeague;
  }

  async findAllLeagues(): Promise<ILeague[]> {
    const row = await this.db.selectFrom('league').selectAll().execute();
    return row as ILeague[];
  }

  async findOneLeague(id: string): Promise<ILeague | null> {
    const row = await this.db
      .selectFrom('league')
      .selectAll()
      .where('leagueId', '=', id)
      .executeTakeFirst();

    return row ? row as ILeague : null;
  }

  async updateLeague(id: string, league: Partial<League>): Promise<League | null> {
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

  async deleteLeague(id: string): Promise<boolean> {
    const result = await this.db.deleteFrom('league').where('leagueId', '=', id).executeTakeFirst();
    return (result?.numDeletedRows ?? 0n) > 0n;
  }

  async findLeagueUsers(id: string): Promise<ILeagueUser[]> {
    const row = await this.db.selectFrom('leagueUser').selectAll().where('leagueId', '=', id).execute();
    return row as ILeagueUser[];
  }

  async addLeagueUser(leagueId: string, addLeagueUserDto: AddLeagueUserDto): Promise<ILeagueUser> {
    const row = await this.db
      .insertInto('leagueUser')
      .values({
        leagueId: leagueId,
        userId: addLeagueUserDto.userId,
        role: addLeagueUserDto.role,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return row as ILeagueUser;
  }

  async removeLeagueUser(leagueId: string, userId: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('leagueUser')
      .where('leagueId', '=', leagueId)
      .where('userId', '=', userId)
      .executeTakeFirst();

    return (result?.numDeletedRows ?? 0n) > 0n;
  }

  async updateLeagueUser(
    leagueId: string,
    userId: string,
    updateLeagueUserDto: UpdateLeagueUserDto,
  ): Promise<ILeagueUser> {
    const row = await this.db
      .updateTable('leagueUser')
      .set({
        role: updateLeagueUserDto.role,
      })
      .where('leagueId', '=', leagueId)
      .where('userId', '=', userId)
      .returningAll()
      .executeTakeFirstOrThrow();
    return row as ILeagueUser;
  }

  async findLeagueTeams(leagueId: string): Promise<ITeam[]> {
    const row = await this.db
      .selectFrom('team')
      .selectAll()
      .select((eb) => [withPlayers(eb)])
      .where('leagueId', '=', leagueId)
      .execute();
    return row as ITeam[];
  }

  async createLeagueSettings(
    leagueId: string,
    input: CreateLeagueSettingsDto,
  ): Promise<ILeagueSettings> {
    const now = new Date().toISOString();
    const leagueSettingsId = crypto.randomUUID();

    const inserted = await this.db
      .insertInto('leagueSettings')
      .values({
        leagueSettingsId,
        leagueId: leagueId,
        scoringType: input.scoringType,
        positions: stringifyPositions(input.positions), // <-- serialize
        rbPoolSize: input.rbPoolSize,
        wrPoolSize: input.wrPoolSize,
        qbPoolSize: input.qbPoolSize,
        tePoolSize: input.tePoolSize,
        createdAt: now,
        updatedAt: now,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      ...inserted,
      positions: parsePositions((inserted as any).positions), // <-- deserialize
    };
  }

  async getLatestLeagueSettingsByLeague(leagueId: string): Promise<ILeagueSettings | null> {
    const row = await this.db
      .selectFrom('leagueSettings')
      .selectAll()
      .where('leagueId', '=', leagueId)
      // Kysely prefers tuple form:
      .orderBy('createdAt', 'desc')
      .executeTakeFirst();

    return row ? { ...row, positions: parsePositions((row as any).positions) } : null;
  }

  async findLeagueSettings(leagueSettingsId: string): Promise<ILeagueSettings | null> {
    const row = await this.db
      .selectFrom('leagueSettings')
      .selectAll()
      .where('leagueSettingsId', '=', leagueSettingsId)
      .executeTakeFirst();

    return row ? { ...row, positions: parsePositions((row as any).positions) } : null;
  }
}
// helper parse/stringify (defensive)
// Accepts already-parsed arrays (when ParseJSONResultsPlugin is active) OR JSON strings.
const parsePositions = (value: unknown): string[] => {
  try {
    if (Array.isArray(value)) {
      return value.map(String);
    }
    if (value == null) return [];
    if (typeof value === 'string') {
      const v = value.length ? JSON.parse(value) : [];
      return Array.isArray(v) ? v.map(String) : [];
    }
    // Fallback: unknown JSON shape → coerce to []
    return [];
  } catch {
    return [];
  }
};

const stringifyPositions = (arr: string[]): string => JSON.stringify(arr ?? []);
