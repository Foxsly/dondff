import { Team as TeamEntity } from './entities/team.entity';
import { Inject, Injectable } from '@nestjs/common';
import { Kysely, Selectable } from 'kysely';
import { DB } from '../infrastructure/database/types';
import { CreateTeamDto } from './dto/create-team.dto';

export const TEAMS_REPOSITORY = Symbol('TEAMS_REPOSITORY');

// Repository contract
export interface ITeamsRepository {
  create(team: CreateTeamDto): Promise<TeamEntity>;
  findAll(): Promise<TeamEntity[]>;
  findOne(id: number): Promise<TeamEntity | null>;
  update(id: number, team: Partial<TeamEntity>): Promise<TeamEntity | null>;
  remove(id: number): Promise<boolean>;
}

// In-memory implementation (great for testing or prototyping)

/* eslint-disable @typescript-eslint/require-await */
export class InMemoryTeamsRepository implements ITeamsRepository {
  private teams: TeamEntity[] = [];

  async create(team: CreateTeamDto): Promise<TeamEntity> {
    const teamWithId: TeamEntity = { teamId: this.teams.length + 1, ...team };
    this.teams.push(teamWithId);
    return teamWithId;
  }

  async findAll(): Promise<TeamEntity[]> {
    return this.teams;
  }

  async findOne(id: number): Promise<TeamEntity | null> {
    return this.teams.find((team) => team.teamId === id) ?? null;
  }

  async update(id: number, team: Partial<TeamEntity>): Promise<TeamEntity | null> {
    const index = this.teams.findIndex((team) => team.teamId === id);
    if (index === -1) return null;

    this.teams[index] = { ...this.teams[index], ...team };
    return this.teams[index];
  }

  async remove(id: number): Promise<boolean> {
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

  private mapToEntity = (row: Selectable<DB['team']>): TeamEntity =>
    new TeamEntity(
      row.teamId!,
      row.leagueId,
      row.userId,
      row.seasonYear,
      row.week,
      row.position,
      row.playerId,
      row.playerName,
    );

  async create(team: CreateTeamDto): Promise<TeamEntity> {
    const result = await this.db
      .insertInto('team')
      .values({
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

    return this.mapToEntity(result);
  }

  async findAll(): Promise<TeamEntity[]> {
    const rows: Selectable<DB['team']>[] = await this.db.selectFrom('team').selectAll().execute();
    return rows.map(this.mapToEntity);
  }

  async findOne(id: number): Promise<TeamEntity | null> {
    const row = await this.db
      .selectFrom('team')
      .selectAll()
      .where('teamId', '=', id)
      .executeTakeFirst();

    return row ? this.mapToEntity(row) : null;
  }

  async update(id: number, team: Partial<TeamEntity>): Promise<TeamEntity | null> {
    const result = await this.db
      .updateTable('team')
      .set({
        ...(team.leagueId && {leagueId: team.leagueId }),
        ...(team.userId && {userId: team.userId }),
        ...(team.seasonYear && {seasonYear: team.seasonYear }),
        ...(team.week && {week: team.week }),
        ...(team.position && {position: team.position }),
        ...(team.playerId && {playerId: team.playerId }),
        ...(team.playerName && {playerName: team.playerName }),      })
      .where('teamId', '=', id)
      .returningAll()
      .executeTakeFirst();

    return result ? this.mapToEntity(result) : null;
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.db.deleteFrom('team').where('teamId', '=', id).executeTakeFirst();
    return (result?.numDeletedRows ?? 0n) > 0n;
  }
}
