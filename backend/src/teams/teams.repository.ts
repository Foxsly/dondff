import { CreateTeamDto, Team as TeamEntity, Team } from './entities/team.entity';
import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { DB } from '../infrastructure/database/types';

export const TEAMS_REPOSITORY = Symbol('TEAMS_REPOSITORY');

// Repository contract
export interface ITeamsRepository {
  create(team: CreateTeamDto): Promise<TeamEntity>;
  findAll(): Promise<TeamEntity[]>;
  findOne(id: string): Promise<Team | null>;
  update(id: string, team: Partial<Team>): Promise<Team | null>;
  remove(id: string): Promise<boolean>;
}

// In-memory implementation (great for testing or prototyping)

/* eslint-disable @typescript-eslint/require-await */
export class InMemoryTeamsRepository implements ITeamsRepository {
  private teams: TeamEntity[] = [];

  async create(team: CreateTeamDto): Promise<TeamEntity> {
    const teamWithId: TeamEntity = { teamId: crypto.randomUUID(), ...team };
    this.teams.push(teamWithId);
    return teamWithId;
  }

  async findAll(): Promise<TeamEntity[]> {
    return this.teams;
  }

  async findOne(id: string): Promise<Team | null> {
    return this.teams.find((team) => team.teamId === id) ?? null;
  }

  async update(id: string, team: Partial<Team>): Promise<Team | null> {
    const index = this.teams.findIndex((team) => team.teamId === id);
    if (index === -1) return null;

    this.teams[index] = { ...this.teams[index], ...team };
    return this.teams[index];
  }

  async remove(id: string): Promise<boolean> {
    const index = this.teams.findIndex((team) => team.teamId === id);
    if (index === -1) return false;

    this.teams.splice(index, 1);
    return true;
  }

  // Helper for tests
  seed(teams: TeamEntity[]) {
    this.teams = teams;
  }
}
/* eslint-enable @typescript-eslint/require-await */

@Injectable()
export class DatabaseTeamsRepository implements ITeamsRepository {
  constructor(@Inject('DB_CONNECTION') private readonly db: Kysely<DB>) {}

  async create(team: CreateTeamDto): Promise<TeamEntity> {
    return await this.db
      .insertInto('team')
      .values({
        teamId: crypto.randomUUID(),
        leagueId: team.leagueId,
        userId: team.userId,
        seasonYear: team.seasonYear,
        week: team.week,
        position: team.position,
        playerId: team.playerId,
        playerName: team.playerName,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async findAll(): Promise<TeamEntity[]> {
    return await this.db.selectFrom('team').selectAll().execute();
  }

  async findOne(id: string): Promise<Team | null> {
    const row = await this.db
      .selectFrom('team')
      .selectAll()
      .where('teamId', '=', id)
      .executeTakeFirst();

    return row ? row : null;
  }

  async update(id: string, team: Partial<Team>): Promise<Team | null> {
    const result = await this.db
      .updateTable('team')
      .set({
        ...(team.leagueId && { leagueId: team.leagueId }),
        ...(team.userId && { userId: team.userId }),
        ...(team.seasonYear && { seasonYear: team.seasonYear }),
        ...(team.week && { week: team.week }),
        ...(team.position && { position: team.position }),
        ...(team.playerId && { playerId: team.playerId }),
        ...(team.playerName && { playerName: team.playerName }),
      })
      .where('teamId', '=', id)
      .returningAll()
      .executeTakeFirst();

    return result ? result : null;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.db.deleteFrom('team').where('teamId', '=', id).executeTakeFirst();
    return (result?.numDeletedRows ?? 0n) > 0n;
  }
}
