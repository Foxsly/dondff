import { CreateTeamDto, ITeam, Team as TeamEntity, Team } from './entities/team.entity';
import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { DB } from '../infrastructure/database/types';
import { jsonArrayFrom } from 'kysely/helpers/sqlite';

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

  async create(team: CreateTeamDto): Promise<Team> {
    const teamWithId: Team = { teamId: crypto.randomUUID(), ...team };
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
    //TODO SHOULD THIS CONTAIN A RESET FLAG, OR DOES THAT GO ON TeamPlayer?
    //DO WE STORE THE PLAYERS IN THE BOXES IN CASE SOMEONE TRIES THE REFRESH WORKAROUND?
    //CREATE SEPARATE TeamPlayerBoxes TABLE THAT AUDITS THE PLAYERS IN THE BOXES?
    return await this.db
      .insertInto('team')
      .values({
        teamId: crypto.randomUUID(),
        leagueId: team.leagueId,
        userId: team.userId,
        seasonYear: team.seasonYear,
        week: team.week,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async findAll(): Promise<ITeam[]> {
    return await this.db
      .selectFrom('team')
      .selectAll()
      .select((eb) => [
        'teamId',
        jsonArrayFrom(
          eb
            .selectFrom('teamPlayer')
            .select([
              'teamPlayer.teamId',
              'teamPlayer.playerId',
              'teamPlayer.position',
              'teamPlayer.playerName',
            ])
            .whereRef('teamPlayer.teamId', '=', 'team.teamId'),
        ).as('players'),
      ])
      .execute();
  }

  async findOne(teamId: string): Promise<ITeam | null> {
    const teamRow = await this.db
      .selectFrom('team')
      .selectAll()
      .select((eb) => [
        'teamId',
        jsonArrayFrom(
          eb
            .selectFrom('teamPlayer')
            .select([
              'teamPlayer.teamId',
              'teamPlayer.playerId',
              'teamPlayer.position',
              'teamPlayer.playerName',
            ])
            .whereRef('teamPlayer.teamId', '=', 'team.teamId'),
        ).as('players'),
      ])
      .where('teamId', '=', teamId)
      .executeTakeFirst();

    return teamRow ? teamRow : null;
  }

  async update(id: string, team: Partial<Team>): Promise<Team | null> {
    const result = await this.db
      .updateTable('team')
      .set({
        ...(team.leagueId && { leagueId: team.leagueId }),
        ...(team.userId && { userId: team.userId }),
        ...(team.seasonYear && { seasonYear: team.seasonYear }),
        ...(team.week && { week: team.week }),
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
