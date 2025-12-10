import { CreateTeamPlayerDto, TeamPlayer } from '@/teams/entities/team-player.entity';
import { TeamsEntryRepository } from '@/teams/teams-entry.repository';
import { TeamsRepository } from '@/teams/teams.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ITeamEntryAudit,
  TeamEntryCaseBoxDto,
  TeamEntryCasePlayerDto,
  TeamEntryCasesResponseDto,
} from './entities/team-entry.entity';
import { CreateTeamDto, ITeam, Team, UpdateTeamDto } from './entities/team.entity';

@Injectable()
export class TeamsService {
  constructor(private readonly teamsRepository: TeamsRepository,
              private readonly teamsEntryRepository: TeamsEntryRepository) {}

  async create(createTeamDto: CreateTeamDto): Promise<Team> {
    return this.teamsRepository.create(createTeamDto);
  }

  async findAll(): Promise<ITeam[]> {
    return this.teamsRepository.findAll();
  }

  async findOne(id: string): Promise<ITeam> {
    const league = await this.teamsRepository.findOne(id);
    if (!league) {
      throw new NotFoundException(`Team with id ${id} not found`);
    }
    return league;
  }

  async update(id: string, updateTeamDto: UpdateTeamDto): Promise<Team> {
    const updated = await this.teamsRepository.update(id, updateTeamDto);
    if (!updated) {
      throw new NotFoundException(`Team with id ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const removed = await this.teamsRepository.remove(id);
    if (!removed) {
      throw new NotFoundException(`Team with id ${id} not found`);
    }
  }

  async upsertTeamPlayer(teamId: string, dto: CreateTeamPlayerDto): Promise<TeamPlayer> {
    return this.teamsRepository.upsertTeamPlayer(teamId, dto);
  }

  /**
   * Return the current "cases" for a team entry at a given position.
   *
   * - Resolves the latest TeamEntry for (teamId, position)
   * - Loads all associated TeamEntryAudit rows
   * - Shapes them into the TeamEntryCasesResponseDto, without exposing
   *   which player is in which case.
   */
  async getTeamCases(teamId: string, position: string): Promise<TeamEntryCasesResponseDto> {
    const entry = await this.teamsEntryRepository.findLatestEntryForTeamPosition(teamId, position);

    if (!entry) {
      throw new NotFoundException(`No team entry found for team ${teamId} and position ${position}`);
    }

    const audits: ITeamEntryAudit[] = await this.teamsEntryRepository.findAuditsForEntry(entry.teamEntryId);

    return {
      teamEntryId: entry.teamEntryId,
      teamId: entry.teamId,
      position: entry.position,
      leagueSettingsId: entry.leagueSettingsId,
      resetCount: entry.resetCount,
      status: entry.status,
      players: audits as TeamEntryCasePlayerDto[],
      boxes: audits as TeamEntryCaseBoxDto[],
    };
  }
}
