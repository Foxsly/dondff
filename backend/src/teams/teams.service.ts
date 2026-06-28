import { SportLeague } from '@/common/types/sport-league.type';
import { shuffle } from '@/common/util';
import { EventsService } from '@/events/events.service';
import { ILeagueSettings } from '@/leagues/entities/league-settings.entity';
import { LeaguesService } from '@/leagues/leagues.service';
import {
  IPlayerProjection,
  IPlayerStats,
  PlayerProjectionResponse,
} from '@/player-stats/entities/player-stats.entity';
import { PlayerStatsService } from '@/player-stats/player-stats.service';
import { ITeamPlayer, TeamPlayer } from '@/teams/entities/team-player.entity';
import { ITeamStatus } from '@/teams/entities/team-status.entity';
import { TeamsEntryRepository } from '@/teams/teams-entry.repository';
import { TeamsRepository } from '@/teams/teams.repository';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { CreateTeamDto, ITeam, Team, UpdateTeamDto } from './entities/team.entity';
import { TeamsGameStrategyRegistry } from './strategies/teams-game-strategy.registry';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly teamsEntryRepository: TeamsEntryRepository,
    private readonly leaguesService: LeaguesService,
    private readonly playerStatsService: PlayerStatsService,
    private readonly eventsService: EventsService,
    private readonly teamsGameRegistry: TeamsGameStrategyRegistry,
  ) {}

  async create(createTeamDto: CreateTeamDto): Promise<Team> {
    return this.teamsRepository.create(createTeamDto);
  }

  async findAll(): Promise<ITeam[]> {
    return this.teamsRepository.findAll();
  }

  async findOne(id: string): Promise<ITeam> {
    const team = await this.teamsRepository.findOne(id);
    if (!team) {
      throw new NotFoundException(`Team with id ${id} not found`);
    }
    return team;
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

  // Check if all positions configured for the league have finished
  // If all positions are finished, the team is no longer playable
  async getTeamStatus(teamId: string): Promise<ITeamStatus> {
    const team: ITeam = await this.findOne(teamId);
    const leagueSettings = await this.leaguesService.getLatestLeagueSettingsByLeague(team.leagueId);
    const positions = await this.leaguesService.getPositionsForLeagueSettings(leagueSettings.leagueSettingsId);

    // Get existing entries for this team
    const existingEntries = await this.getAllTeamEntriesForTeam(teamId);
    const entryMap = new Map(existingEntries.map(e => [e.position, e]));

    // Check if ALL positions are finished
    const allFinished = positions.every(pos => {
      const entry = entryMap.get(pos.position);
      return entry?.status === 'finished';
    });

    return {
      // No positions configured or no entries means game hasn't started — always playable
      playable: positions.length === 0 || existingEntries.length === 0 || !allFinished,
    } as ITeamStatus;
  }

  // Returns only existing entries - does not include pending positions without entries
  // TODO: Consider returning all positions including pending ones that don't have entries yet
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
    // Get or create entry, generate cases if they don't exist
    const entry = await this.getOrCreateTeamEntryWithCases(teamId, position);
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
    //We do not need a new entry per reset count. We should be updating, and there should generally only be one entry per team/position
    //The only thing that doesn't have a reset_number is team_entry_offer, but you shouldn't be able to reset after getting an offer anyways
    let updatedTeamEntry = await this.teamsEntryRepository.updateEntry(teamEntry.teamEntryId, {
      status: 'pending',
      resetCount: teamEntry.resetCount + 1,
    });
    if (!updatedTeamEntry) {
      throw new NotFoundException(`Could not update TeamEntry with id ${teamEntry.teamEntryId}`);
    }
    let team: ITeam = await this.findOne(teamId);
    const league = await this.leaguesService.findOne(team.leagueId);
    let leagueSettings: ILeagueSettings = await this.leaguesService.getLatestLeagueSettingsByLeague(
      team.leagueId,
    );
    const eventGroup = await this.eventsService.findOneEventGroup(team.eventGroupId);
    await this.generateCasesForPosition(
      team,
      position,
      leagueSettings,
      league.sportLeague,
      this.teamsGameRegistry.get(league.sportLeague).getNumberOfCases(eventGroup),
    );
  }

  async generateCasesForPosition(
    team: ITeam,
    position: string,
    leagueSettings: ILeagueSettings,
    sportLeague: SportLeague,
    numberOfCases: number = 10,
  ) {
    let playerProjections: PlayerProjectionResponse =
      await this.playerStatsService.getPlayerProjections(
        position,
        team.seasonYear,
        team.eventGroupId,
        sportLeague,
      );
    let teamEntry: ITeamEntry = await this.getOrCreateTeamEntry(
      team.teamId,
      position,
      leagueSettings.leagueSettingsId,
    );
    let boxNumber = 1;

    const poolSize = (await this.leaguesService.getPositionForLeagueSettings(leagueSettings.leagueSettingsId, position)).poolSize;

    let trimmedPlayers: IPlayerProjection[] = await this.teamsGameRegistry
      .get(sportLeague)
      .determinePlayerPool(playerProjections, team, position, poolSize);

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

  // Get or create team entry and ensure cases exist (generate if needed)
  private async getOrCreateTeamEntryWithCases(
    teamId: string,
    position: string,
  ): Promise<ITeamEntry> {
    const team = await this.findOne(teamId);
    const league = await this.leaguesService.findOne(team.leagueId);
    const leagueSettings = await this.leaguesService.getLatestLeagueSettingsByLeague(team.leagueId);

    const entry = await this.getOrCreateTeamEntry(
      teamId,
      position,
      leagueSettings.leagueSettingsId,
    );

    // Check if audits exist for current reset
    const audits = await this.teamsEntryRepository.findCurrentAuditsForEntry(entry.teamEntryId);
    if (audits.length === 0) {
      // Generate cases - this also handles shared pool exclusion for GOLF
      await this.generateCasesForPosition(
        team,
        position,
        leagueSettings,
        league.sportLeague,
        this.teamsGameRegistry.get(league.sportLeague).getNumberOfCases(
          await this.eventsService.findOneEventGroup(team.eventGroupId),
        ),
      );
    }

    return entry;
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

    // Remove players in boxes, previously offered players, and already-selected players from the projections
    let playerIdsInBoxes = teamEntryAudits.map((entry) => entry.playerId);

    const poolSize = (await this.leaguesService.getPositionForLeagueSettings(teamEntry.leagueSettingsId, teamEntry.position)).poolSize;
    const poolProjections = await this.teamsGameRegistry.get(league.sportLeague).determinePlayerPool(projections, team, teamEntry.position, poolSize);

    let availableOffers = poolProjections.filter(
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

  async calculateAndPersistScores(eventGroupId: string): Promise<void> {
    // Get event group with status (status is calculated on-the-fly)
    const eventGroupWithStatus = await this.eventsService.getEventGroupWithDates(eventGroupId);

    if (eventGroupWithStatus.status !== 'FINISHED') {
      this.logger.warn(`Event group "${eventGroupWithStatus.name}" is not finished (status: ${eventGroupWithStatus.status}), skipping score calculation`);
      return;
    }

    const eventGroup = eventGroupWithStatus;
    const teams = await this.teamsRepository.findTeamsByEventGroup(eventGroupId);

    if (teams.length === 0) {
      this.logger.warn(`No teams found for event group ${eventGroupId}`);
      return;
    }

    // Check if scores are already calculated for all teams
    const allScoresCalculated = teams.every(team => 
      team.players.every(player => player.actualPoints !== null)
    );

    if (allScoresCalculated) {
      this.logger.log(`Scores already calculated for event group "${eventGroup.name}", skipping`);
      return;
    }

    const leagueId = teams[0].leagueId;
    const seasonYear = teams[0].seasonYear;
    const sportLeague = eventGroup.sportLeague as SportLeague;
    const positions = await this.leaguesService.getPositionsForLeague(leagueId);

    // Fetch stats once per position
    const statsByPosition = new Map<string, IPlayerStats[]>();
    for (const pos of positions) {
      const stats = await this.playerStatsService.getPlayerStatistics(
        pos.position,
        seasonYear,
        eventGroupId,
        sportLeague,
      );
      statsByPosition.set(pos.position, stats);
    }

    const nameMatchStrategy = this.teamsGameRegistry.get(sportLeague);

    for (const team of teams) {
      for (const player of team.players) {
        const stats = statsByPosition.get(player.position) ?? [];

        // Try matching by playerId first (NFL), then by name (golf)
        let matched = stats.find((s) => s.playerId === player.playerId);
        if (!matched && player.playerName) {
          const normalizedPlayerName = nameMatchStrategy.normalizePlayerName(player.playerName);
          matched = stats.find((s) => nameMatchStrategy.normalizePlayerName(s.name) === normalizedPlayerName);
        }

        if (matched) {
          await this.teamsRepository.updatePlayerActualPoints(
            team.teamId,
            player.position,
            matched.points,
          );
        } else {
          this.logger.warn(
            `No stats found for player "${player.playerName}" (${player.playerId}) in ${player.position}`,
          );
        }
      }
    }

    this.logger.log(`Scores persisted for event group "${eventGroup.name}" (${teams.length} teams)`);
  }
}
