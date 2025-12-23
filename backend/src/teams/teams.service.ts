import { ILeagueSettings } from '@/leagues/entities/league-settings.entity';
import { LeaguesService } from '@/leagues/leagues.service';
import { SleeperService } from '@/sleeper/sleeper.service';
import { CreateTeamPlayerDto, TeamPlayer } from '@/teams/entities/team-player.entity';
import { ITeamStatus } from '@/teams/entities/team-status.entity';
import { TeamsEntryRepository } from '@/teams/teams-entry.repository';
import { TeamsRepository } from '@/teams/teams.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ITeamEntry,
  ITeamEntryAudit,
  ITeamEntryOffer,
  TeamEntryCaseBoxDto,
  TeamEntryCasePlayerDto,
  TeamEntryCasesResponseDto,
  TeamEntryOfferStatus,
} from './entities/team-entry.entity';
import { CreateTeamDto, ITeam, Team, UpdateTeamDto } from './entities/team.entity';

//yacht-fisher shuffle: https://github.com/queviva/yacht-fisher
const shuffle = (v, r = [...v]) => v.map(() => r.splice(~~(Math.random() * r.length), 1)[0]);

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
    for (const position of leagueSettings.positions) {
      await this.generateCasesForPosition(createdTeam, position, leagueSettings);
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
    let teamEntry = await this.teamsEntryRepository.findLatestEntryForTeamPosition(
      teamId,
      position,
    );
    if (!teamEntry) {
      throw new NotFoundException(
        `TeamEntry for team with id ${teamId} and position ${position} not found`,
      );
    }
    return teamEntry;
  }

  async getTeamStatus(teamId: string): Promise<ITeamStatus> {
    let team: ITeam = await this.findOne(teamId);
    let leagueSettings: ILeagueSettings = await this.leaguesService.getLatestLeagueSettingsByLeague(
      team.leagueId,
    );
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
  async getDisassociatedTeamCases(
    teamId: string,
    position: string,
  ): Promise<TeamEntryCasesResponseDto> {
    const entry = await this.getTeamEntryForTeamId(teamId, position);
    const audits = await this.teamsEntryRepository.findCurrentAuditsForEntry(entry.teamEntryId);
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

  async selectCase(teamId: string, position: string, caseNumber: number): Promise<ITeamEntry> {
    let teamEntry = await this.getTeamEntry(teamId, position);
    let updatedTeamEntry = await this.teamsEntryRepository.updateEntry(teamEntry.teamEntryId, {
      selectedBox: caseNumber,
      status: 'playing',
    });
    if (!updatedTeamEntry) {
      throw new NotFoundException(`Could not update TeamEntry with id ${teamEntry.teamEntryId}`);
    }
    return updatedTeamEntry;
  }

  async resetCases(teamId: string, position: string) {
    let teamEntry = await this.getTeamEntry(teamId, position);
    //TODO This should not update the reset count; we should be creating a new team entry with an updated resetCount?
    //Or am I overthinking this - do we need a new entry per reset count, or just new team_entry_audits?
    //We do not need a new entry per reset count. We should be updating, and there should generally only be one entry per team/position
    //The only thing that doesn't have a reset_number is team_entry_offer, but you shouldn't be able to reset after getting an offer anyways
    let updatedTeamEntry = await this.teamsEntryRepository.updateEntry(teamEntry.teamEntryId, {
      status: 'pending',
      resetCount: teamEntry.resetCount + 1,
    });
    if (!updatedTeamEntry) {
      throw new NotFoundException(`Could not update TeamEntry with id ${teamEntry.teamEntryId}`);
    }
    let team: Team = await this.findOne(teamId);
    let leagueSettings: ILeagueSettings = await this.leaguesService.getLatestLeagueSettingsByLeague(
      team.leagueId,
    );
    await this.generateCasesForPosition(team, position, leagueSettings);
  }

  async generateCasesForPosition(team: Team, position: string, leagueSettings: ILeagueSettings) {
    let playerProjections = await this.sleeperService.getPlayerProjections(position, team.seasonYear, team.week);
    let teamEntry: ITeamEntry = await this.getOrCreateTeamEntry(
      team.teamId,
      position,
      leagueSettings.leagueSettingsId,
    );
    let boxNumber = 1;

    let trimmedPlayers = playerProjections.slice(
      0,
      leagueSettings[position.toLowerCase() + 'PoolSize'],
    );
    let cases: Array<Omit<ITeamEntryAudit, 'auditId'>> = shuffle(trimmedPlayers)
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

  async getOrCreateTeamEntry(
    teamId: string,
    position: string,
    leagueSettingsId: string,
  ): Promise<ITeamEntry> {
    let teamEntry = await this.teamsEntryRepository.findLatestEntryForTeamPosition(
      teamId,
      position,
    );
    if (!teamEntry) {
      teamEntry = await this.teamsEntryRepository.createEntry(teamId, position, leagueSettingsId);
    }
    return teamEntry;
  }

  async getCurrentOffer(teamId: string, position: string): Promise<ITeamEntryOffer> {
    const teamEntry: ITeamEntry = await this.getTeamEntryForTeamId(teamId, position);
    const currentOffer = await this.teamsEntryRepository.getCurrentOffer(teamEntry.teamEntryId);
    if (!currentOffer) {
      return this.calculateOffer(teamEntry);
    }
    return currentOffer;
  }

  async calculateOffer(teamEntry: ITeamEntry): Promise<ITeamEntryOffer> {
    let teamEntryAudits = await this.teamsEntryRepository.findCurrentAuditsForEntry(
      teamEntry.teamEntryId,
    );
    const eligibleCases = teamEntryAudits.filter(
      (entry) => entry.boxStatus === 'available' || entry.boxStatus === 'selected',
    );

    if (eligibleCases.length === 0) {
      throw new Error('No eligible cases found for offer calculation');
    }

    const finalOfferValue = Math.sqrt(
      eligibleCases.map((a) => a.projectedPoints ** 2).reduce((sum, v) => sum + v, 0) /
        eligibleCases.length,
    );

    const team: ITeam = await this.findOne(teamEntry.teamId);
    const projections = await this.sleeperService.getPlayerProjections(
      teamEntry.position,
      team.seasonYear,
      team.week,
    );

    // Get all previous offers (both accepted and rejected) to filter them out
    const previousOffers = await this.getOffers(teamEntry.teamId, teamEntry.position);
    const previousOfferPlayerIds = previousOffers.map(offer => offer.playerId);

    // Remove players in boxes and previously offered players from the projections
    let playerIdsInBoxes = teamEntryAudits.map((entry) => entry.playerId);
    let availableOffers = projections.filter(
      (player) => !playerIdsInBoxes.includes(player.player_id) &&
                 !previousOfferPlayerIds.includes(player.player_id)
    );

    if (availableOffers.length === 0) {
      throw new Error('No available players left to make an offer');
    }

    const closestOffer = availableOffers.reduce(
      (closest, current) => {
        const currentDiff = Math.abs(current.stats.pts_ppr - finalOfferValue);
        const closestDiff = Math.abs(closest.stats.pts_ppr - finalOfferValue);
        return currentDiff < closestDiff ? current : closest;
      },
    );

    const offer: Omit<ITeamEntryOffer, 'offerId'> = {
      teamEntryId: teamEntry.teamEntryId,
      playerId: closestOffer.player_id,
      playerName: `${closestOffer.player.first_name} ${closestOffer.player.last_name}`,
      injuryStatus: closestOffer.player.injury_status,
      projectedPoints: closestOffer.stats.pts_ppr,
      status: 'pending' as TeamEntryOfferStatus,
    };

    return this.teamsEntryRepository.createOffer(offer);
  }

  async updateOfferStatus(teamId: string, position: string, status: TeamEntryOfferStatus): Promise<ITeamEntryOffer> {
    const teamEntry: ITeamEntry = await this.getTeamEntryForTeamId(teamId, position);
    const currentOffer = await this.teamsEntryRepository.getCurrentOffer(teamEntry.teamEntryId);
    if (!currentOffer) {
      throw new NotFoundException(`No current offer found for team ${teamId} and position ${position}`);
    }

    const updatedOffer = await this.teamsEntryRepository.updateOfferStatus(currentOffer.offerId, status);
    if (!updatedOffer) {
      throw new NotFoundException(`Could not update offer with id ${currentOffer.offerId}`);
    }
    return updatedOffer;
  }

  async getOffers(teamId: string, position: string, status?: TeamEntryOfferStatus): Promise<ITeamEntryOffer[]> {
    const teamEntry: ITeamEntry = await this.getTeamEntryForTeamId(teamId, position);
    return this.teamsEntryRepository.getOffers(teamEntry.teamEntryId, status);
  }

  async handleFinalOffer(teamId: string, position: string, keep: boolean): Promise<ITeamEntryOffer> {

  }

  private async getTeamEntryForTeamId(teamId: string, position: string) {
    const entry = await this.teamsEntryRepository.findLatestEntryForTeamPosition(teamId, position);

    if (!entry) {
      throw new NotFoundException(
        `No team entry found for team ${teamId} and position ${position}`,
      );
    }
    return entry;
  }
}
