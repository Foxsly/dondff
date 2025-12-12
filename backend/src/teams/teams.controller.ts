import { ITeamEntry, TeamEntryCasesResponseDto } from '@/teams/entities/team-entry.entity';
import { ITeamStatus } from '@/teams/entities/team-status.entity';
import { Controller, Body, Query } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TypedBody, TypedParam, TypedRoute } from '@nestia/core';
import type { CreateTeamDto, ITeam, Team, UpdateTeamDto } from './entities/team.entity';
import type { CreateTeamPlayerDto, TeamPlayer } from '@/teams/entities/team-player.entity';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @TypedRoute.Post()
  async create(@Body() createTeamDto: CreateTeamDto): Promise<Team> {
    return this.teamsService.create(createTeamDto);
  }

  @TypedRoute.Get()
  async findAll(): Promise<ITeam[]> {
    return this.teamsService.findAll();
  }

  @TypedRoute.Get(':id')
  async findOne(@TypedParam('id') id: string): Promise<ITeam> {
    return this.teamsService.findOne(id);
  }

  @TypedRoute.Patch(':id')
  async update(@TypedParam('id') id: string, @Body() updateTeamDto: UpdateTeamDto): Promise<Team> {
    return this.teamsService.update(id, updateTeamDto);
  }

  @TypedRoute.Delete(':id')
  async remove(@TypedParam('id') id: string): Promise<void> {
    return this.teamsService.remove(id);
  }

  @TypedRoute.Put(':teamId/players')
  upsertTeamPlayer(
    @TypedParam('teamId') teamId: string,
    @TypedBody() dto: CreateTeamPlayerDto,
  ): Promise<TeamPlayer> {
    return this.teamsService.upsertTeamPlayer(teamId, dto);
  }

  @TypedRoute.Get(':teamId/entry')
  findTeamEntry(
    @TypedParam('teamId') teamId: string,
    @Query('position') position: string,
  ): Promise<ITeamEntry> {
    return this.teamsService.getTeamEntry(teamId, position);
  }

  @TypedRoute.Get(':teamId/status')
  getTeamStatus(@TypedParam('teamId') teamId: string): Promise<ITeamStatus> {
    return this.teamsService.getTeamStatus(teamId);
  }

  /**
   * GET /teams/:teamId/cases?position=RB
   *
   * Returns the current "cases" for the team & position.
   *
   * Does NOT reveal which player is inside which case — only metadata
   * such as boxNumber & boxStatus ("hidden", "opened", etc.).
   */
  @TypedRoute.Get('/:teamId/cases')
  async getTeamCases(
    @TypedParam('teamId') teamId: string,
    @Query('position') position: string,
  ): Promise<TeamEntryCasesResponseDto> {
    if (!position) {
      // consistent with our API error shape across modules
      throw new Error('Query parameter "position" is required');
    }

    return this.teamsService.getTeamCases(teamId, position);
  }

  /**
   * Create a new API for POST /teams/{teamId}/cases
   * Updates the TEAM_ENTRY with the selected case
   * Input: includes an action (selectCase), position, and the case number
   * Returns: success or failure - error if a case is already selected
   * @param teamId
   * @param dto
   */
  @TypedRoute.Post(':teamId/cases')
  selectCases(@TypedParam('teamId') teamId: string, @TypedBody() dto: any): Promise<ITeamEntry> {
    let action = dto.action;
    let position = dto.position;
    let caseNumber = dto.boxNumber;

    //TODO handle error cases better?
    return this.teamsService.selectCase(teamId, position, caseNumber);
  }

  /**
   *  Create a new API for `POST /teams/{teamId}/cases/reset`
   *  Resets the cases for a game - shouldn't be allowed if the reset limit has been reached already, or if a case has already been selected
   *  Input: position
   *  Returns: new player list
   */
  @TypedRoute.Post(':teamId/cases/reset')
  async resetCases(
    @TypedParam('teamId') teamId: string,
    @TypedBody() dto: any,
  ): Promise<TeamEntryCasesResponseDto> {
    //TODO Handle edge cases still - don't allow extra resets, don't allow resets once a box has been selected, etc
    await this.teamsService.resetCases(teamId, dto.position);
    return this.teamsService.getTeamCases(teamId, dto.position);
  }
}
