import { CreateTeamDto, ITeam, Team } from './entities/team.entity';
import { Inject, Injectable } from '@nestjs/common';
import { ExpressionBuilder, Kysely } from 'kysely';
import { jsonArrayFrom as sqliteJsonArrayFrom } from 'kysely/helpers/sqlite';
import { jsonArrayFrom as postgresJsonArrayFrom } from 'kysely/helpers/postgres';
import { DB } from '@/infrastructure/database/types';
import { DB_PROVIDER } from '@/infrastructure/database/database.module';
import { CreateTeamPlayerDto, TeamPlayer } from '@/teams/entities/team-player.entity';

export abstract class TeamsRepository {
  abstract create(team: CreateTeamDto): Promise<Team>;
  abstract findAll(): Promise<ITeam[]>;
  abstract findOne(id: string): Promise<ITeam | null>;
  abstract update(id: string, team: Partial<Team>): Promise<Team | null>;
  abstract remove(id: string): Promise<boolean>;
  abstract upsertTeamPlayer(teamId: string, dto: CreateTeamPlayerDto): Promise<TeamPlayer>;
}

@Injectable()
export class DatabaseTeamsRepository extends TeamsRepository {
  constructor(@Inject(DB_PROVIDER) private readonly db: Kysely<DB>) {
    super();
  }

  async create(team: CreateTeamDto): Promise<Team> {
    const row = await this.db
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
    return row as Team;
  }

  async findAll(): Promise<ITeam[]> {
    const rows = await this.db
      .selectFrom('team')
      .selectAll()
      .select((eb) => [withPlayers(eb)])
      .execute();
    return rows as ITeam[];
  }

  async findOne(teamId: string): Promise<ITeam | null> {
    const row = await this.db
      .selectFrom('team')
      .selectAll()
      .select((eb) => [withPlayers(eb)])
      .where('teamId', '=', teamId)
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

function resolveJsonArrayFrom() {
  const engine = (process.env.DB_ENGINE ?? 'sqlite').toLowerCase();

  if (engine === 'postgres' || engine === 'postgresql' || engine === 'pg') {
    return postgresJsonArrayFrom;
  }

  // Default to sqlite helper for local dev/tests
  return sqliteJsonArrayFrom;
}

export function withPlayers(eb: ExpressionBuilder<DB, 'team'>) {
  const jsonArrayFrom = resolveJsonArrayFrom();

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
