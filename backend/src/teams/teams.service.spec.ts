import { LeaguesModule } from '@/leagues/leagues.module';
import { SleeperModule } from '@/sleeper/sleeper.module';
import { TeamsEntryRepository } from '@/teams/teams-entry.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from './teams.service';
import { NotFoundException } from '@nestjs/common';
import { ITeam, Team, CreateTeamDto, UpdateTeamDto } from './entities/team.entity';
import { TeamsRepository } from '@/teams/teams.repository';
import { LeaguesService } from '@/leagues/leagues.service';
import { PlayerStatsService } from '@/player-stats/player-stats.service';
import { EventsService } from '@/events/events.service';
import { IPlayerProjection } from '@/player-stats/entities/player-stats.entity';

/** Build N fake golf projections with sequential player IDs */
function buildGolfProjections(count: number, startId: number = 1): IPlayerProjection[] {
  return Array.from({ length: count }, (_, i) => ({
    playerId: `player-${startId + i}`,
    name: `Golfer ${startId + i}`,
    position: 'GOLF_PLAYER' as const,
    team: 'GOLF',
    projectedPoints: 100 - i,
    injuryStatus: null,
  }));
}

describe('TeamsService', () => {
  let service: TeamsService;
  let repo: jest.Mocked<TeamsRepository>;

  beforeEach(async () => {
    const mockTeamsRepository: jest.Mocked<TeamsRepository> = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      upsertTeamPlayer: jest.fn(),
    } as any;
    const mockTeamsEntryRepository: jest.Mocked<TeamsEntryRepository> = {
      createEntry: jest.fn(),
      findEntryById: jest.fn(),
      findLatestEntryForTeamPosition: jest.fn(),
      updateEntry: jest.fn(),
      insertAuditSnapshots: jest.fn(),
      createOffer: jest.fn(),
      updateOfferStatus: jest.fn(),
      appendEvent: jest.fn(),
      listEventsForEntry: jest.fn(),
      findAuditsForEntry: jest.fn(),
      findCurrentAuditsForEntry: jest.fn(),
      getCurrentOffer: jest.fn(),
      getOffers: jest.fn(),
      updateAuditStatus: jest.fn(),
    } as any;


    const module: TestingModule = await Test.createTestingModule({
      providers: [TeamsService, { provide: TeamsRepository, useValue: mockTeamsRepository }, {provide:TeamsEntryRepository, useValue: mockTeamsEntryRepository}],
      imports: [SleeperModule, LeaguesModule]
    }).compile();

    service = module.get<TeamsService>(TeamsService);
    repo = module.get(TeamsRepository) as jest.Mocked<TeamsRepository>;
  });

  const mockTeam: Team = {
    teamId: 'team-1',
    leagueId: 'league-1',
    userId: 'user-1',
    seasonYear: 2025,
    eventGroupId: 'event-group-1',
  };

  const mockITeam: ITeam = {
    teamId: 'team-1',
    leagueId: 'league-1',
    userId: 'user-1',
    seasonYear: 2025,
    eventGroupId: 'event-group-1',
    players: [],
  };

  describe('create', () => {
    it('should call repo.create and return the team', async () => {
      const dto: CreateTeamDto = {
        leagueId: 'league-1',
        userId: 'user-1',
        seasonYear: 2025,
        eventGroupId: 'event-group-1',
      };
      repo.create.mockResolvedValue(mockTeam);

      const result = await service.create(dto);
      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockTeam);
    });
  });

  describe('findAll', () => {
    it('should return all teams', async () => {
      repo.findAll.mockResolvedValue([mockITeam]);
      const result = await service.findAll();
      expect(repo.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockITeam]);
    });
  });

  describe('findOne', () => {
    it('should return a team if found', async () => {
      repo.findOne.mockResolvedValue(mockITeam);
      const result = await service.findOne('team-1');
      expect(repo.findOne).toHaveBeenCalledWith('team-1');
      expect(result).toEqual(mockITeam);
    });

    it('should throw NotFoundException if team not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('team-2')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and return the team', async () => {
      const updateDto: UpdateTeamDto = { eventGroupId: 'event-group-2' };
      const updatedTeam = { ...mockTeam, eventGroupId: 'event-group-2' };
      repo.update.mockResolvedValue(updatedTeam);

      const result = await service.update('team-1', updateDto);
      expect(repo.update).toHaveBeenCalledWith('team-1', updateDto);
      expect(result).toEqual(updatedTeam);
    });

    it('should throw NotFoundException if team not found', async () => {
      repo.update.mockResolvedValue(null);
      const updateDto: UpdateTeamDto = { eventGroupId: 'event-group-2' };
      await expect(service.update('team-2', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove the team', async () => {
      repo.remove.mockResolvedValue(true);
      await service.remove('team-1');
      expect(repo.remove).toHaveBeenCalledWith('team-1');
    });

    it('should throw NotFoundException if team not found', async () => {
      repo.remove.mockResolvedValue(false);
      await expect(service.remove('team-2')).rejects.toThrow(NotFoundException);
    });
  });
});

describe('TeamsService — golf shared pool exclusion', () => {
  let service: TeamsService;
  let teamsRepo: jest.Mocked<TeamsRepository>;
  let entryRepo: jest.Mocked<TeamsEntryRepository>;
  let leaguesService: jest.Mocked<LeaguesService>;
  let playerStatsService: jest.Mocked<PlayerStatsService>;
  let eventsService: jest.Mocked<EventsService>;

  const GOLF_POSITIONS = [
    { leagueSettingsId: 'ls-1', position: 'GOLF_PLAYER_1', poolSize: 150 },
    { leagueSettingsId: 'ls-1', position: 'GOLF_PLAYER_2', poolSize: 150 },
    { leagueSettingsId: 'ls-1', position: 'GOLF_PLAYER_3', poolSize: 150 },
  ];

  const golfTeam: Team = {
    teamId: 'golf-team-1',
    leagueId: 'golf-league-1',
    userId: 'user-1',
    seasonYear: 2025,
    eventGroupId: 'eg-1',
  };

  beforeEach(async () => {
    teamsRepo = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      upsertTeamPlayer: jest.fn(),
    } as any;

    entryRepo = {
      createEntry: jest.fn(),
      findEntryById: jest.fn(),
      findLatestEntryForTeamPosition: jest.fn(),
      updateEntry: jest.fn(),
      insertAuditSnapshots: jest.fn(),
      createOffer: jest.fn(),
      updateOfferStatus: jest.fn(),
      appendEvent: jest.fn(),
      listEventsForEntry: jest.fn(),
      findAuditsForEntry: jest.fn(),
      findCurrentAuditsForEntry: jest.fn(),
      getCurrentOffer: jest.fn(),
      getOffers: jest.fn(),
      updateAuditStatus: jest.fn(),
    } as any;

    leaguesService = {
      findOne: jest.fn(),
      getLatestLeagueSettingsByLeague: jest.fn(),
      getPositionsForLeagueSettings: jest.fn(),
    } as any;

    playerStatsService = {
      getPlayerProjections: jest.fn(),
    } as any;

    eventsService = {
      findOneEventGroup: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: TeamsRepository, useValue: teamsRepo },
        { provide: TeamsEntryRepository, useValue: entryRepo },
        { provide: LeaguesService, useValue: leaguesService },
        { provide: PlayerStatsService, useValue: playerStatsService },
        { provide: EventsService, useValue: eventsService },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  function mockTeamEntry(position: string) {
    return {
      teamEntryId: `entry-${position}`,
      teamId: golfTeam.teamId,
      position,
      leagueSettingsId: 'ls-1',
      resetCount: 0,
      selectedBox: null,
      status: 'pending' as const,
    };
  }

  describe('generateCasesForPosition', () => {
    it('should exclude specified player IDs from generated cases', async () => {
      const projections = buildGolfProjections(20);
      const excludeIds = ['player-1', 'player-2', 'player-3'];

      playerStatsService.getPlayerProjections.mockResolvedValue(projections);
      entryRepo.findLatestEntryForTeamPosition.mockResolvedValue(null);
      entryRepo.createEntry.mockResolvedValue(mockTeamEntry('GOLF_PLAYER_1'));
      leaguesService.getPositionsForLeagueSettings.mockResolvedValue(GOLF_POSITIONS);
      entryRepo.insertAuditSnapshots.mockResolvedValue(undefined as any);

      const leagueSettings = { leagueSettingsId: 'ls-1', leagueId: 'golf-league-1', scoringType: 'PPR' };
      const result = await service.generateCasesForPosition(
        golfTeam, 'GOLF_PLAYER_1', leagueSettings as any, 'GOLF', 10, excludeIds,
      );

      // The inserted audit snapshots should not contain any excluded player IDs
      const insertedCases = entryRepo.insertAuditSnapshots.mock.calls[0][0];
      const insertedPlayerIds = insertedCases.map((c: any) => c.playerId);

      for (const excludedId of excludeIds) {
        expect(insertedPlayerIds).not.toContain(excludedId);
      }
      expect(insertedCases).toHaveLength(10);
      // Return value should match inserted player IDs
      expect(result).toEqual(insertedPlayerIds);
    });

    it('should not filter any players when excludePlayerIds is empty', async () => {
      const projections = buildGolfProjections(20);

      playerStatsService.getPlayerProjections.mockResolvedValue(projections);
      entryRepo.findLatestEntryForTeamPosition.mockResolvedValue(null);
      entryRepo.createEntry.mockResolvedValue(mockTeamEntry('GOLF_PLAYER_1'));
      leaguesService.getPositionsForLeagueSettings.mockResolvedValue(GOLF_POSITIONS);
      entryRepo.insertAuditSnapshots.mockResolvedValue(undefined as any);

      const leagueSettings = { leagueSettingsId: 'ls-1', leagueId: 'golf-league-1', scoringType: 'PPR' };
      await service.generateCasesForPosition(
        golfTeam, 'GOLF_PLAYER_1', leagueSettings as any, 'GOLF', 10, [],
      );

      const insertedCases = entryRepo.insertAuditSnapshots.mock.calls[0][0];
      // All 10 cases drawn from the full pool of 20
      expect(insertedCases).toHaveLength(10);
    });
  });

  describe('create — golf team', () => {
    it('should only generate cases for the first position at creation time', async () => {
      const projections = buildGolfProjections(150);

      teamsRepo.create.mockResolvedValue(golfTeam);
      leaguesService.findOne.mockResolvedValue({ leagueId: 'golf-league-1', name: 'Golf League', sportLeague: 'GOLF' } as any);
      leaguesService.getLatestLeagueSettingsByLeague.mockResolvedValue({ leagueSettingsId: 'ls-1', leagueId: 'golf-league-1', scoringType: 'PPR' } as any);
      leaguesService.getPositionsForLeagueSettings.mockResolvedValue(GOLF_POSITIONS);
      eventsService.findOneEventGroup.mockResolvedValue({ eventGroupId: 'eg-1', name: 'The Masters', sportLeague: 'GOLF', startDate: '2025-04-10', endDate: '2025-04-13' } as any);
      playerStatsService.getPlayerProjections.mockResolvedValue(projections);
      entryRepo.insertAuditSnapshots.mockResolvedValue(undefined as any);

      entryRepo.findLatestEntryForTeamPosition.mockResolvedValue(null);
      entryRepo.createEntry.mockResolvedValue(mockTeamEntry('GOLF_PLAYER_1'));

      await service.create({
        leagueId: 'golf-league-1',
        userId: 'user-1',
        seasonYear: 2025,
        eventGroupId: 'eg-1',
      });

      // Only one position's cases generated at creation time (GOLF_PLAYER_1)
      expect(entryRepo.insertAuditSnapshots).toHaveBeenCalledTimes(1);
      expect(entryRepo.createEntry).toHaveBeenCalledTimes(1);
    });
  });

  describe('getDisassociatedTeamCases — lazy generation', () => {
    it('should lazily generate cases for a deferred golf position, excluding the selected golfer', async () => {
      const projections = buildGolfProjections(150);

      // No entry exists yet for GOLF_PLAYER_2:
      //   1st call (getDisassociatedTeamCases) → null
      //   2nd call (getOrCreateTeamEntry inside generateCasesForPosition) → null
      //   3rd call (after lazy generation completes) → the new entry
      entryRepo.findLatestEntryForTeamPosition
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockTeamEntry('GOLF_PLAYER_2'));

      const teamWithPlayer1Selected = {
        ...golfTeam,
        players: [
          { teamId: golfTeam.teamId, position: 'GOLF_PLAYER_1', playerId: 'player-5', playerName: 'Golfer 5', projectedPoints: 95 },
        ],
      } as any;

      // findOne is called multiple times (service.findOne + getExcludedPlayerIdsForPosition)
      teamsRepo.findOne.mockResolvedValue(teamWithPlayer1Selected);

      leaguesService.findOne.mockResolvedValue({ leagueId: 'golf-league-1', name: 'Golf League', sportLeague: 'GOLF' } as any);
      leaguesService.getLatestLeagueSettingsByLeague.mockResolvedValue({ leagueSettingsId: 'ls-1', leagueId: 'golf-league-1', scoringType: 'PPR' } as any);
      leaguesService.getPositionsForLeagueSettings.mockResolvedValue(GOLF_POSITIONS);
      eventsService.findOneEventGroup.mockResolvedValue({ eventGroupId: 'eg-1', name: 'The Masters', sportLeague: 'GOLF', startDate: '2025-04-10', endDate: '2025-04-13' } as any);
      playerStatsService.getPlayerProjections.mockResolvedValue(projections);
      playerStatsService.getTeamAndOpponentForPlayer = jest.fn().mockReturnValue({ team: 'GOLF', opponent: '' });
      entryRepo.insertAuditSnapshots.mockResolvedValue(undefined as any);
      entryRepo.createEntry.mockResolvedValue(mockTeamEntry('GOLF_PLAYER_2'));
      entryRepo.findCurrentAuditsForEntry.mockResolvedValue(
        buildGolfProjections(10, 10).map((p, i) => ({
          auditId: `audit-${i}`,
          teamEntryId: 'entry-GOLF_PLAYER_2',
          resetNumber: 0,
          boxNumber: i + 1,
          playerId: p.playerId,
          playerName: p.name,
          projectedPoints: p.projectedPoints,
          injuryStatus: null,
          boxStatus: 'available' as const,
        })),
      );

      const result = await service.getDisassociatedTeamCases(golfTeam.teamId, 'GOLF_PLAYER_2');

      // Cases were generated (lazy generation triggered)
      expect(entryRepo.insertAuditSnapshots).toHaveBeenCalledTimes(1);

      // The generated cases should not contain player-5 (selected for GOLF_PLAYER_1)
      const insertedCases = entryRepo.insertAuditSnapshots.mock.calls[0][0];
      const insertedPlayerIds = insertedCases.map((c: any) => c.playerId);
      expect(insertedPlayerIds).not.toContain('player-5');

      // Result is a valid response
      expect(result.position).toBe('GOLF_PLAYER_2');
      expect(result.boxes).toHaveLength(10);
    });
  });

  describe('resetCases — golf', () => {
    it('should exclude players already selected for other positions', async () => {
      const projections = buildGolfProjections(150);

      // Simulate: GOLF_PLAYER_1 is finished with player-5 selected, resetting GOLF_PLAYER_2
      entryRepo.findLatestEntryForTeamPosition.mockResolvedValue(mockTeamEntry('GOLF_PLAYER_2'));
      entryRepo.updateEntry.mockResolvedValue({ ...mockTeamEntry('GOLF_PLAYER_2'), resetCount: 1 });
      teamsRepo.findOne.mockResolvedValue({
        ...({ ...golfTeam, players: [
          { teamId: golfTeam.teamId, position: 'GOLF_PLAYER_1', playerId: 'player-5', playerName: 'Golfer 5', projectedPoints: 95 },
        ]} as any),
      });
      leaguesService.findOne.mockResolvedValue({ leagueId: 'golf-league-1', name: 'Golf League', sportLeague: 'GOLF' } as any);
      leaguesService.getLatestLeagueSettingsByLeague.mockResolvedValue({ leagueSettingsId: 'ls-1', leagueId: 'golf-league-1', scoringType: 'PPR' } as any);
      leaguesService.getPositionsForLeagueSettings.mockResolvedValue(GOLF_POSITIONS);
      eventsService.findOneEventGroup.mockResolvedValue({ eventGroupId: 'eg-1', name: 'The Masters', sportLeague: 'GOLF', startDate: '2025-04-10', endDate: '2025-04-13' } as any);
      playerStatsService.getPlayerProjections.mockResolvedValue(projections);
      entryRepo.insertAuditSnapshots.mockResolvedValue(undefined as any);
      entryRepo.createEntry.mockResolvedValue({ ...mockTeamEntry('GOLF_PLAYER_2'), resetCount: 1 });

      await service.resetCases(golfTeam.teamId, 'GOLF_PLAYER_2');

      const insertedCases = entryRepo.insertAuditSnapshots.mock.calls[0][0];
      const insertedPlayerIds = insertedCases.map((c: any) => c.playerId);

      // player-5 is already selected for GOLF_PLAYER_1, must not appear in GOLF_PLAYER_2 cases
      expect(insertedPlayerIds).not.toContain('player-5');
      expect(insertedCases).toHaveLength(10);
    });
  });
});
