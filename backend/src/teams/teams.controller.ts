import {
  ITeamEntry,
  ITeamEntryOffer,
  TeamEntryAuditFinalDecisionInputDto,
  TeamEntryCasesResponseDto,
  TeamEntryOfferResponseDto,
} from '@/teams/entities/team-entry.entity';
import type { ITeamPlayer, TeamPlayer } from '@/teams/entities/team-player.entity';
import { ITeamStatus } from '@/teams/entities/team-status.entity';
import { TypedBody, TypedParam, TypedRoute } from '@nestia/core';
import { Body, Controller, Query } from '@nestjs/common';
import type { CreateTeamDto, ITeam, Team, UpdateTeamDto } from './entities/team.entity';
import { TeamsService } from './teams.service';

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
    @TypedBody() dto: ITeamPlayer,
  ): Promise<TeamPlayer> {
    return this.teamsService.upsertTeamPlayer(teamId, dto);
  }

  //TODO This should probably be split into two methods, where one is entry/:position instead of the query parameter
  @TypedRoute.Get(':teamId/entry')
  findTeamEntry(
    @TypedParam('teamId') teamId: string,
    @Query('position') position?: string,
  ): Promise<ITeamEntry> | Promise<ITeamEntry[]> {
    if (position) {
      return this.teamsService.getTeamEntry(teamId, position);
    } else {
      return this.teamsService.getAllTeamEntriesForTeam(teamId);
    }
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

    return this.teamsService.getDisassociatedTeamCases(teamId, position);
  }

  /**
   * Create a new API for POST /teams/{teamId}/cases
   * Updates the TEAM_ENTRY with the selected case
   * Input: includes position and the case number
   * Returns: success or failure - error if a case is already selected
   * @param teamId
   * @param dto
   */
  @TypedRoute.Post(':teamId/cases')
  async selectCase(
    @TypedParam('teamId') teamId: string,
    @TypedBody() dto: any,
  ): Promise<TeamEntryOfferResponseDto> {
    let position = dto.position;
    let caseNumber = dto.boxNumber;

    //TODO handle error cases better?
    const teamEntry = await this.teamsService.selectCase(teamId, position, caseNumber);
    const eliminatedCases = await this.teamsService.eliminateCases(teamId, position);
    const offer = await this.teamsService.calculateOffer(teamEntry);
    return {
      boxes: eliminatedCases,
      offer: this.teamsService.addTeamsToOffer(offer),
    };
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
    return this.teamsService.getDisassociatedTeamCases(teamId, dto.position);
  }

  /**
   * Create a new API for `GET /teams/{teamId}/offers`
   * Returns the current offer for a TEAM_ENTRY, based on the boxes that have not been eliminated
   * Includes a query parameter for position
   */

  @TypedRoute.Get('/:teamId/offers')
  async getCurrentOffer(
    @TypedParam('teamId') teamId: string,
    @Query('position') position: string,
  ): Promise<ITeamEntryOffer> {
    return await this.teamsService.getCurrentOffer(teamId, position);
  }

  @TypedRoute.Post(':teamId/offers/accept')
  async acceptOffer(@TypedParam('teamId') teamId: string, @TypedBody() dto: { position: string }) {
    return this.teamsService.acceptOffer(teamId, dto.position);
  }

  @TypedRoute.Post(':teamId/offers/reject')
  async rejectOffer(
    @TypedParam('teamId') teamId: string,
    @TypedBody() dto: { position: string },
  ): Promise<TeamEntryOfferResponseDto> {
    return this.teamsService.rejectOffer(teamId, dto.position);
  }

  @TypedRoute.Post(':teamId/offers')
  async updateOffer(
    @TypedParam('teamId') teamId: string,
    @TypedBody() dto: TeamEntryAuditFinalDecisionInputDto,
  ) {
    return this.teamsService.handleFinalOffer(teamId, dto.position, dto.decision);
  }
}
