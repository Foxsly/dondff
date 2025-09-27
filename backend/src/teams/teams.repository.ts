import { CreateTeamDto, ITeam, Team } from './entities/team.entity';
import { Inject, Injectable } from '@nestjs/common';
import { ExpressionBuilder, Kysely } from 'kysely';
import { DB } from '@/infrastructure/database/types';
import { jsonArrayFrom } from 'kysely/helpers/sqlite';
import { DB_PROVIDER } from '@/infrastructure/database/database.module';
import { CreateTeamPlayerDto, TeamPlayer } from '@/teams/entities/team-player.entity';

export const TEAMS_REPOSITORY = Symbol('TEAMS_REPOSITORY');

// Repository contract
export interface ITeamsRepository {
  create(team: CreateTeamDto): Promise<Team>;
  findAll(): Promise<ITeam[]>;
  findOne(id: string): Promise<ITeam | null>;
  update(id: string, team: Partial<Team>): Promise<Team | null>;
  remove(id: string): Promise<boolean>;
  upsertTeamPlayer(teamId: string, dto: CreateTeamPlayerDto): Promise<TeamPlayer>;
}

@Injectable()
export class DatabaseTeamsRepository implements ITeamsRepository {
  constructor(@Inject(DB_PROVIDER) private readonly db: Kysely<DB>) {}

  async create(team: CreateTeamDto): Promise<Team> {
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
      .select((eb) => [withPlayers(eb)])
      .execute();
  }

  async findOne(teamId: string): Promise<ITeam | null> {
    const teamRow = await this.db
      .selectFrom('team')
      .selectAll()
      .select((eb) => [withPlayers(eb)])
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

  async upsertTeamPlayer(teamId: string, dto: CreateTeamPlayerDto): Promise<TeamPlayer> {
    await this.db
      .insertInto('teamPlayer')
      .values({
        teamId,
        position: dto.position,
        playerId: dto.playerId,
        playerName: dto.playerName,
      })
      .onConflict((oc) =>
        oc.columns(['teamId', 'position']).doUpdateSet({
          playerId: dto.playerId,
          playerName: dto.playerName,
        }),
      )
      .execute();

    const row = await this.db
      .selectFrom('teamPlayer')
      .selectAll()
      .where('teamId', '=', teamId)
      .where('position', '=', dto.position)
      .executeTakeFirstOrThrow();

    return row as TeamPlayer;
  }
}

export function withPlayers(eb: ExpressionBuilder<DB, 'team'>) {
  return jsonArrayFrom(
    eb
      .selectFrom('teamPlayer')
      .select([
        'teamPlayer.teamId',
        'teamPlayer.playerId',
        'teamPlayer.position',
        'teamPlayer.playerName',
      ])
      .whereRef('teamPlayer.teamId', '=', 'team.teamId'),
  ).as('players');
}
