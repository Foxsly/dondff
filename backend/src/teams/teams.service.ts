import {ILeagueSettings} from '@/leagues/entities/league-settings.entity';
import {SportLeague} from '@/leagues/entities/league.entity';
import {LeaguesService} from '@/leagues/leagues.service';
import {IPlayerProjection, PlayerProjectionResponse,} from '@/player-stats/entities/player-stats.entity';
import {PlayerStatsService} from '@/player-stats/player-stats.service';
import {ITeamPlayer, TeamPlayer} from '@/teams/entities/team-player.entity';
import {ITeamStatus} from '@/teams/entities/team-status.entity';
import {TeamsEntryRepository} from '@/teams/teams-entry.repository';
import {TeamsRepository} from '@/teams/teams.repository';
import {EventsService} from '@/events/events.service';
import {EventGroup} from '@/events/entities/event-group.entity';
import {Injectable, NotFoundException} from '@nestjs/common';
import {
    ITeamEntry,
    ITeamEntryAudit,
    ITeamEntryOffer,
    PlayerOfferDto,
    TeamEntryAuditFinalDecision,
    TeamEntryBoxStatus,
    TeamEntryCaseBoxDto,
    TeamEntryCasePlayerDto,
    TeamEntryCasesResponseDto,
    TeamEntryFinalResponseDto,
    TeamEntryOfferResponseDto,
    TeamEntryOfferStatus,
} from './entities/team-entry.entity';
import {CreateTeamDto, ITeam, Team, UpdateTeamDto} from './entities/team.entity';

//yacht-fisher shuffle: https://github.com/queviva/yacht-fisher
const shuffle = (v, r = [...v]) => v.map(() => r.splice(~~(Math.random() * r.length), 1)[0]);

@Injectable()
export class TeamsService {
  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly teamsEntryRepository: TeamsEntryRepository,
    private readonly leaguesService: LeaguesService,
    private readonly playerStatsService: PlayerStatsService,
    private readonly eventsService: EventsService,
  ) {}

  async create(createTeamDto: CreateTeamDto): Promise<Team> {
    let createdTeam: Team = await this.teamsRepository.create(createTeamDto);
    const league = await this.leaguesService.findOne(createdTeam.leagueId);
    let leagueSettings: ILeagueSettings = await this.leaguesService.getLatestLeagueSettingsByLeague(
      createdTeam.leagueId,
    );

    // Get positions from the new league_settings_position table
    const positions = await this.leaguesService.getPositionsForLeagueSettings(
      leagueSettings.leagueSettingsId,
    );

    const eventGroup = await this.eventsService.findOneEventGroup(createTeamDto.eventGroupId);

    //TODO extract this into a 'generateCasesForTeam' that just takes the leagueId and the createdTeam, and does the position looping within it
    // For sports with a shared player pool (e.g. GOLF), only generate cases for
    // the first position at creation time. Subsequent positions are generated
    // lazily once the prior position finishes, so the selected player can be
    // excluded from the pool.
    const positionsToGenerate = this.sportUsesSharedPlayerPool(league.sportLeague)
      ? positions.slice(0, 1)
      : positions;

    for (const position of positionsToGenerate) {
      await this.generateCasesForPosition(
        createdTeam,
        position.position,
        leagueSettings,
        league.sportLeague,
        this.getNumberOfCases(eventGroup),
      );
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

  async upsertTeamPlayer(teamId: string, dto: ITeamPlayer): Promise<TeamPlayer> {
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
    const teamEntries = await this.getAllTeamEntriesForTeam(teamId);
    return {
      // No entries means the game hasn't started yet — always playable
      playable: teamEntries.length === 0 || !teamEntries.every((e) => e.status === 'finished'),
    } as ITeamStatus;
  }

  async getAllTeamEntriesForTeam(teamId: string): Promise<ITeamEntry[]> {
    let team: ITeam = await this.findOne(teamId);
    let leagueSettings: ILeagueSettings = await this.leaguesService.getLatestLeagueSettingsByLeague(
      team.leagueId,
    );
    const positions = await this.leaguesService.getPositionsForLeagueSettings(
      leagueSettings.leagueSettingsId,
    );
    const teamEntries: ITeamEntry[] = [];
    for (const position of positions) {
      const entry = await this.teamsEntryRepository.findLatestEntryForTeamPosition(
        teamId,
        position.position,
      );
      if (entry) teamEntries.push(entry);
    }
    return teamEntries;
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
    let entry = await this.teamsEntryRepository.findLatestEntryForTeamPosition(teamId, position);

    // Lazy generation: for shared-pool sports (e.g. GOLF), cases for positions
    // beyond the first are not created at team-creation time. Generate them now,
    // excluding any players already selected for other positions.
    if (!entry) {
      entry = await this.lazyGenerateCasesIfSharedPool(teamId, position);
    }
    if (!entry) {
      throw new NotFoundException(
        `TeamEntry for team with id ${teamId} and position ${position} not found`,
      );
    }
    const audits = await this.teamsEntryRepository.findCurrentAuditsForEntry(entry.teamEntryId);

    const playerListAudits = audits.map((audit) => ({
      ...audit,
      boxStatus: audit.boxStatus === 'selected' ? 'available' : audit.boxStatus,
      matchup: this.playerStatsService.getTeamAndOpponentForPlayer(audit.playerId),
    })) as TeamEntryCasePlayerDto[];
    const boxAudits = audits.map((audit) => ({
      boxNumber: audit.boxNumber,
      boxStatus: audit.boxStatus,
      //Conditional object spreading - only include these if the box is eliminated
      ...(audit.boxStatus === 'eliminated'
        ? {
            boxNumber: audit.boxNumber,
            playerId: audit.playerId,
            playerName: audit.playerName,
            projectedPoints: audit.projectedPoints,
          }
        : {}),
    })) as TeamEntryCaseBoxDto[];
    return {
      teamEntryId: entry.teamEntryId,
      teamId: entry.teamId,
      position: entry.position,
      leagueSettingsId: entry.leagueSettingsId,
      resetCount: entry.resetCount,
      status: entry.status,
      players: shuffle(playerListAudits),
      boxes: boxAudits,
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
    const teamEntryAudits = await this.teamsEntryRepository.findCurrentAuditsForEntry(
      teamEntry.teamEntryId,
    );
    const selectedAudit = teamEntryAudits.find((audit) => audit.boxNumber === caseNumber);
    if (!selectedAudit) {
      throw new NotFoundException(
        `Could not update TeamEntryAudit to 'selected' for box number ${caseNumber}`,
      );
    }
    await this.teamsEntryRepository.updateAuditStatus(
      selectedAudit.auditId,
      'selected' as TeamEntryBoxStatus,
    );
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
    const league = await this.leaguesService.findOne(team.leagueId);
    let leagueSettings: ILeagueSettings = await this.leaguesService.getLatestLeagueSettingsByLeague(
      team.leagueId,
    );
    const eventGroup = await this.eventsService.findOneEventGroup(team.eventGroupId);
    const excludePlayerIds = await this.getExcludedPlayerIdsForPosition(team, position, league.sportLeague);
    await this.generateCasesForPosition(
      team,
      position,
      leagueSettings,
      league.sportLeague,
      this.getNumberOfCases(eventGroup),
      excludePlayerIds,
    );
  }

  async generateCasesForPosition(
    team: Team,
    position: string,
    leagueSettings: ILeagueSettings,
    sportLeague: SportLeague,
    numberOfCases: number = 10,
    excludePlayerIds: string[] = [],
  ): Promise<string[]> {
    let playerProjections: PlayerProjectionResponse = await this.playerStatsService.getPlayerProjections(position, team.seasonYear, team.eventGroupId, sportLeague,);
    let teamEntry: ITeamEntry = await this.getOrCreateTeamEntry(
      team.teamId,
      position,
      leagueSettings.leagueSettingsId,
    );
    let boxNumber = 1;

    //TODO this seems like we could probably extract this logic to a "getPositionForLeagueSettings" method on LeaguesService
    const poolSize = (await this.leaguesService.getPositionsForLeagueSettings(leagueSettings.leagueSettingsId))
      .find((positionSettings) => positionSettings.position === position)?.poolSize;
    let trimmedPlayers: IPlayerProjection[] = playerProjections.slice(0, poolSize);

    if (excludePlayerIds.length > 0) {
      const excludeSet = new Set(excludePlayerIds);
      trimmedPlayers = trimmedPlayers.filter((p) => !excludeSet.has(p.playerId));
    }

    let cases: Array<Omit<ITeamEntryAudit, 'auditId'>> = shuffle(trimmedPlayers)
      .slice(0, numberOfCases)
      .map((player: IPlayerProjection) => ({
        teamEntryId: teamEntry.teamEntryId,
        resetNumber: teamEntry.resetCount,
        boxNumber: boxNumber++,
        playerId: player.playerId,
        playerName: player.name,
        projectedPoints: player.projectedPoints,
        injuryStatus: player.injuryStatus,
        boxStatus: 'available',
      }));
    await this.teamsEntryRepository.insertAuditSnapshots(cases);
    return cases.map((c) => c.playerId);
  }

  /**
   * For shared-pool sports, lazily generates cases for a position that was
   * deferred at team-creation time. Returns the newly created TeamEntry,
   * or null if the sport does not use a shared pool.
   */
  private async lazyGenerateCasesIfSharedPool(
    teamId: string,
    position: string,
  ): Promise<ITeamEntry | null> {
    const team = await this.findOne(teamId);
    const league = await this.leaguesService.findOne(team.leagueId);
    if (!this.sportUsesSharedPlayerPool(league.sportLeague)) {
      return null;
    }
    const leagueSettings = await this.leaguesService.getLatestLeagueSettingsByLeague(team.leagueId);
    const eventGroup = await this.eventsService.findOneEventGroup(team.eventGroupId);
    const excludePlayerIds = await this.getExcludedPlayerIdsForPosition(team, position, league.sportLeague);
    await this.generateCasesForPosition(
      team,
      position,
      leagueSettings,
      league.sportLeague,
      this.getNumberOfCases(eventGroup),
      excludePlayerIds,
    );
    return this.teamsEntryRepository.findLatestEntryForTeamPosition(teamId, position);
  }

  /**
   * For sports where all positions draw from the same player pool (e.g. GOLF),
   * returns the player IDs that should be excluded when generating cases for the
   * given position — i.e. players already selected for other positions.
   */
  private async getExcludedPlayerIdsForPosition(
    team: Team,
    position: string,
    sportLeague: SportLeague,
  ): Promise<string[]> {
    if (!this.sportUsesSharedPlayerPool(sportLeague)) {
      return [];
    }
    const fullTeam = await this.teamsRepository.findOne(team.teamId);
    if (!fullTeam) {
      return [];
    }
    // Exclude players already locked in via teamPlayer for other positions
    return fullTeam.players
      .filter((p) => p.position !== position)
      .map((p) => p.playerId);
  }

  private sportUsesSharedPlayerPool(sportLeague: SportLeague): boolean {
    return sportLeague === 'GOLF';
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

  async getCurrentOffer(teamId: string, position: string): Promise<PlayerOfferDto> {
    const teamEntry: ITeamEntry = await this.getTeamEntry(teamId, position);
    const currentOffer = await this.teamsEntryRepository.getCurrentOffer(teamEntry.teamEntryId);
    if (!currentOffer) {
      const newOffer = await this.calculateOffer(teamEntry);
      return this.addTeamsToOffer(newOffer);
    }
    return this.addTeamsToOffer(currentOffer);
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

    const team: ITeam = await this.findOne(teamEntry.teamId);
    const league = await this.leaguesService.findOne(team.leagueId);
    const projections = await this.playerStatsService.getPlayerProjections(
      teamEntry.position,
      team.seasonYear,
      team.eventGroupId,
      league.sportLeague,
    );

    // Get all previous offers (both accepted and rejected) to filter them out
    const previousOffers = await this.getOffers(teamEntry.teamId, teamEntry.position);
    const previousOfferPlayerIds = previousOffers.map((offer) => offer.playerId);

    // Remove players in boxes and previously offered players from the projections
    let playerIdsInBoxes = teamEntryAudits.map((entry) => entry.playerId);
    let availableOffers = projections.filter(
      (player) =>
        !playerIdsInBoxes.includes(player.playerId) &&
        !previousOfferPlayerIds.includes(player.playerId),
    );

    if (availableOffers.length === 0) {
      throw new Error('No available players left to make an offer');
    }

    const finalOfferValue = Math.sqrt(
      eligibleCases.map((a) => a.projectedPoints ** 2)
                   .reduce((sum, v) => sum + v, 0)
      / eligibleCases.length,
    );
    const closestOffer = availableOffers.reduce((closest, current) => {
      const currentDiff = Math.abs(current.projectedPoints - finalOfferValue);
      const closestDiff = Math.abs(closest.projectedPoints - finalOfferValue);
      return currentDiff < closestDiff ? current : closest;
    });

    const offer: Omit<ITeamEntryOffer, 'offerId'> = {
      teamEntryId: teamEntry.teamEntryId,
      playerId: closestOffer.playerId,
      playerName: closestOffer.name,
      injuryStatus: closestOffer.injuryStatus || null,
      projectedPoints: closestOffer.projectedPoints,
      status: 'pending' as TeamEntryOfferStatus,
    };

    return this.teamsEntryRepository.createOffer(offer);
  }

  async updateOfferStatus(
    teamId: string,
    position: string,
    status: TeamEntryOfferStatus,
  ): Promise<ITeamEntryOffer> {
    const teamEntry: ITeamEntry = await this.getTeamEntry(teamId, position);
    const currentOffer = await this.teamsEntryRepository.getCurrentOffer(teamEntry.teamEntryId);
    if (!currentOffer) {
      throw new NotFoundException(
        `No current offer found for team ${teamId} and position ${position}`,
      );
    }

    const updatedOffer = await this.teamsEntryRepository.updateOfferStatus(
      currentOffer.offerId,
      status,
    );
    if (!updatedOffer) {
      throw new NotFoundException(`Could not update offer with id ${currentOffer.offerId}`);
    }
    return updatedOffer;
  }

  async eliminateCases(teamId: string, position: string): Promise<ITeamEntryAudit[]> {
    const teamEntry: ITeamEntry = await this.getTeamEntry(teamId, position);
    const audits = await this.teamsEntryRepository.findCurrentAuditsForEntry(teamEntry.teamEntryId);

    // Filter to only available boxes (excluding selected and already eliminated)
    const availableAudits = audits.filter(
      (audit) => audit.boxStatus === 'available' && audit.boxNumber !== teamEntry.selectedBox,
    );

    // Determine number of cases to eliminate based on the round (derived from available cases)
    let casesToEliminate: number;
    if (availableAudits.length >= 9) {
      casesToEliminate = 3; // Round 1: 9 remaining, eliminate 3
    } else if (availableAudits.length >= 4) {
      casesToEliminate = 2; // Round 2/3: 6/4 remaining, eliminate 2
    } else if (availableAudits.length >= 2) {
      casesToEliminate = 1; // Round 4: 2 remaining, eliminate 1
    } else {
      throw new Error('Not enough available cases to eliminate');
    }

    if (availableAudits.length < casesToEliminate) {
      throw new Error(
        `Not enough available cases to eliminate (need at least ${casesToEliminate})`,
      );
    }

    // Randomly select the specified number of audits to eliminate
    const shuffledAudits = shuffle(availableAudits);
    const auditsToEliminate = shuffledAudits.slice(0, casesToEliminate);

    // Update the status of the selected audits to 'eliminated'
    const updatedAudits: ITeamEntryAudit[] = [];
    for (const audit of auditsToEliminate) {
      const updatedAudit = await this.teamsEntryRepository.updateAuditStatus(
        audit.auditId,
        'eliminated' as TeamEntryBoxStatus,
      );
      updatedAudits.push(updatedAudit);
    }

    return updatedAudits;
  }

  async getOffers(
    teamId: string,
    position: string,
    status?: TeamEntryOfferStatus,
  ): Promise<ITeamEntryOffer[]> {
    const teamEntry: ITeamEntry = await this.getTeamEntry(teamId, position);
    return this.teamsEntryRepository.getOffers(teamEntry.teamEntryId, status);
  }

  async acceptOffer(teamId: string, position: string): Promise<TeamEntryOfferResponseDto> {
    const teamEntry: ITeamEntry = await this.getTeamEntry(teamId, position);
    const updatedOffer = await this.updateOfferStatus(teamId, position, 'accepted');
    const audits = await this.teamsEntryRepository.findCurrentAuditsForEntry(teamEntry.teamEntryId);
    await this.teamsEntryRepository.updateEntry(teamEntry.teamEntryId, { status: 'finished' });
    await this.upsertTeamPlayer(teamId, {
      playerId: updatedOffer.playerId,
      playerName: updatedOffer.playerName,
      projectedPoints: updatedOffer.projectedPoints,
      position: position,
      teamId: teamId,
    });
    return {
      offer: this.addTeamsToOffer(updatedOffer),
      boxes: audits,
    };
  }

  async rejectOffer(teamId: string, position: string): Promise<TeamEntryOfferResponseDto> {
    const teamEntry: ITeamEntry = await this.getTeamEntry(teamId, position);
    await this.updateOfferStatus(teamId, position, 'rejected');
    const eliminatedCases = await this.eliminateCases(teamId, position);
    const newOffer = await this.calculateOffer(teamEntry);
    return {
      offer: this.addTeamsToOffer(newOffer),
      boxes: eliminatedCases,
    };
  }

  async handleFinalOffer(
    teamId: string,
    position: string,
    decision: TeamEntryAuditFinalDecision,
  ): Promise<TeamEntryFinalResponseDto> {
    const teamEntry: ITeamEntry = await this.getTeamEntry(teamId, position);
    const audits = await this.teamsEntryRepository.findCurrentAuditsForEntry(teamEntry.teamEntryId);

    // Find the last non-selected box
    const nonSelectedBoxes = audits.filter(
      (audit) => audit.boxStatus === 'available' && audit.boxNumber !== teamEntry.selectedBox,
    );

    if (nonSelectedBoxes.length !== 1) {
      throw new Error('Expected exactly one non-selected box for final decision');
    }

    const lastNonSelectedBox = nonSelectedBoxes[0];

    // Update the status based on the decision
    const newStatus: TeamEntryBoxStatus = decision === 'keep' ? 'eliminated' : 'swapped';
    await this.teamsEntryRepository.updateAuditStatus(lastNonSelectedBox.auditId, newStatus);

    // Update team entry status to finished
    await this.teamsEntryRepository.updateEntry(teamEntry.teamEntryId, { status: 'finished' });
    // Set player on teamPlayer
    const finalPlayer =
      decision === 'keep'
        ? audits.find((audit) => audit.boxStatus === 'selected')
        : lastNonSelectedBox;

    if (!finalPlayer) {
      throw new Error(`Could not save final player. Decision: ${decision}`);
    }

    await this.upsertTeamPlayer(teamId, {
      playerId: finalPlayer.playerId,
      playerName: finalPlayer.playerName,
      projectedPoints: finalPlayer.projectedPoints,
      position: position,
      teamId: teamId,
    });

    // Return all boxes with updated statuses
    const updatedAudits = await this.teamsEntryRepository.findCurrentAuditsForEntry(
      teamEntry.teamEntryId,
    );
    return {
      boxes: updatedAudits,
    };
  }

  addTeamsToOffer(offer: ITeamEntryOffer): PlayerOfferDto {
    return {
      ...offer,
      matchup: this.playerStatsService.getTeamAndOpponentForPlayer(offer.playerId),
    };
  }

  /**
   * Determines the number of cases for a given event group.
   * For NFL playoff weeks with fewer available players, we reduce the case count.
   */
  getNumberOfCases(eventGroup: EventGroup): number {
    // Check if this is an NFL event group with a week number
    const weekMatch = eventGroup.name.match(/Week\s+(\d+)/);
    if (weekMatch) {
      const weekNumber = parseInt(weekMatch[1], 10);
      if (weekNumber === 20) return 6;
    }
    return 10;
  }
}
