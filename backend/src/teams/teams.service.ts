import { ILeagueSettings } from '@/leagues/entities/league-settings.entity';
import { LeaguesService } from '@/leagues/leagues.service';
import { SleeperProjectionResponse } from '@/sleeper/entities/sleeper.entity';
import { SleeperService } from '@/sleeper/sleeper.service';
import { CreateTeamPlayerDto, TeamPlayer } from '@/teams/entities/team-player.entity';
import { ITeamStatus } from '@/teams/entities/team-status.entity';
import { TeamsEntryRepository } from '@/teams/teams-entry.repository';
import { TeamsRepository } from '@/teams/teams.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ITeamEntry,
  ITeamEntryAudit,
  TeamEntryCaseBoxDto,
  TeamEntryCasePlayerDto,
  TeamEntryCasesResponseDto,
} from './entities/team-entry.entity';
import { CreateTeamDto, ITeam, Team, UpdateTeamDto } from './entities/team.entity';

@Injectable()
export class TeamsService {
  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly teamsEntryRepository: TeamsEntryRepository,
    private readonly sleeperService: SleeperService,
    private readonly leaguesService: LeaguesService,
  ) {}

  async create(createTeamDto: CreateTeamDto): Promise<Team> {
    let createdTeam: Team = await this.teamsRepository.create(createTeamDto);
    let leagueSettings: ILeagueSettings = await this.leaguesService.getLatestLeagueSettingsByLeague(
      createdTeam.leagueId,
    );
    const positions = [
      { position: 'RB', limit: 64 },
      { position: 'WR', limit: 96 },
    ];
    for (const position of positions) {
      let playerProjections: SleeperProjectionResponse =
        await this.sleeperService.getPlayerProjections(
          position.position,
          createTeamDto.seasonYear,
          createTeamDto.week,
        );
      let teamEntry: ITeamEntry = await this.teamsEntryRepository.createEntry(
        createdTeam.teamId,
        position.position,
        leagueSettings.leagueSettingsId,
      );
      let boxNumber = 1;
      let cases: Array<Omit<ITeamEntryAudit, 'auditId'>> = playerProjections
        .slice(0, position.limit)
        .sort(() => Math.random() - 0.5)
        .slice(0, 10)
        .map((player) => ({
          teamEntryId: teamEntry.teamEntryId,
          resetNumber: teamEntry.resetCount,
          boxNumber: boxNumber++,
          playerId: player.player_id,
          playerName: `${player.player.first_name} ${player.player.last_name}`,
          projectedPoints: player.stats.pts_ppr,
          injuryStatus: player.player.injury_status,
          boxStatus: 'available',
        }));
      await this.teamsEntryRepository.insertAuditSnapshots(cases);
    }
    return createdTeam;
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

  async getTeamEntry(teamId: string, position: string): Promise<ITeamEntry> {
    let teamEntry = await this.teamsEntryRepository.findLatestEntryForTeamPosition(teamId, position);
    if(!teamEntry) {
      throw new NotFoundException(`TeamEntry for team with id ${teamId} and position ${position} not found`);
    }
    return teamEntry;
  }

  async getTeamStatus(teamId: string): Promise<ITeamStatus> {
    let team: ITeam = await this.findOne(teamId);
    let leagueSettings: ILeagueSettings = await this.leaguesService.getLatestLeagueSettingsByLeague(team.leagueId);
    let playable = true;
    for (let position of leagueSettings.positions) {
      let teamEntry: ITeamEntry = await this.getTeamEntry(teamId, position);
      playable = playable && teamEntry.status !== 'finished';
    }
    return {
      playable: playable,
    } as ITeamStatus;
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
