import { Test, TestingModule } from '@nestjs/testing';
import { LeaguesService } from './leagues.service';
import { NotFoundException } from '@nestjs/common';
import { League } from './entities/league.entity';
import { SportLeague } from '@/common/types/sport-league.type';
import { ITeam } from '@/teams/entities/team.entity';
import { LeaguesRepository } from '@/leagues/leagues.repository';
import { LeagueDefaultsStrategyRegistry } from './strategies/league-defaults-strategy.registry';
import { ILeagueDefaultsStrategy } from './strategies/league-defaults-strategy.interface';

describe('LeaguesService', () => {
  let service: LeaguesService;
  let repo: jest.Mocked<LeaguesRepository>;

  // ---------------------------------------------------------------------------
  // TEST DATA
  // ---------------------------------------------------------------------------
  // mockLeague is a reusable test fixture — a League with all required fields.
  // We use SportLeague type assertion ('NFL' as SportLeague) to satisfy
  // TypeScript without importing the actual league factory. The value doesn't
  // matter for most tests — what matters is that it's a valid League object.
  const mockLeague: League = {
    leagueId: 'uuid-1',
    name: 'Test League',
    sportLeague: SportLeague.NFL,
  };

  // ---------------------------------------------------------------------------
  // MOCK SETUP
  // ---------------------------------------------------------------------------
  // mockRepo is a fake LeaguesRepository where every method is a jest.fn().
  // The "as any" cast is needed because Partial<LeaguesRepository> with
  // jest.Mocked won't satisfy the full abstract interface — but that's fine,
  // we only mock the methods each test actually calls.
  //
  // Why do we mock the repo instead of using a real database?
  // 1. Speed — no DB connection, no setup/teardown
  // 2. Isolation — if a test fails, it's the SERVICE logic that's wrong,
  //    not a query or schema issue
  // 3. Control — we can make the repo return anything (null, error, etc.)
  //    to test every branch of the service
  const mockRepo: jest.Mocked<LeaguesRepository> = {
    createLeague:              jest.fn(),
    findAllLeagues:            jest.fn(),
    findOneLeague:             jest.fn(),
    updateLeague:              jest.fn(),
    deleteLeague:              jest.fn(),
    findLeagueUsers:           jest.fn(),
    addLeagueUser:             jest.fn(),
    removeLeagueUser:          jest.fn(),
    updateLeagueUser:          jest.fn(),
    findLeagueTeams:           jest.fn(),
    createLeagueSettings:      jest.fn(),
    getLatestLeagueSettingsByLeague: jest.fn(),
    findLeagueSettings:        jest.fn(),
    createLeagueSettingsPosition: jest.fn(),
    getLeagueSettingsPositions: jest.fn(),
  } as any;

  // ---------------------------------------------------------------------------
  // MOCK STRATEGY
  // ---------------------------------------------------------------------------
  // mockStrategy is a fake ILeagueDefaultsStrategy used to decouple the test
  // from the actual sport module implementations. Each test can override
  // getDefaultPositions by setting mockStrategyGetDefaultPositions.mockReturnValue().
  const mockStrategy: jest.Mocked<ILeagueDefaultsStrategy> = {
    getDefaultPositions: jest.fn().mockReturnValue([]),
  };

  // ---------------------------------------------------------------------------
  // SETUP (runs before every test)
  // ---------------------------------------------------------------------------
  // NestJS's Test.createTestingModule compiles a lightweight DI container
  // with just the providers we specify. This is the standard way to unit-test
  // a NestJS service.
  //
  // We provide a mock LeagueDefaultsStrategyRegistry that always returns
  // mockStrategy, so tests control which positions are created without
  // importing real sport modules.
  //
  // jest.clearAllMocks() is important here: since all tests share the same
  // mockRepo object (defined at the describe level), calls from one test
  // would leak into the next without resetting. clearAllMocks resets call
  // counts and implementations for every jest.fn() in the module.
  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaguesService,
        { provide: LeaguesRepository, useValue: mockRepo },
        {
          provide: LeagueDefaultsStrategyRegistry,
          useValue: { get: jest.fn().mockReturnValue(mockStrategy) },
        },
      ],
    }).compile();

    service = module.get(LeaguesService);
    repo = module.get(LeaguesRepository) as jest.Mocked<LeaguesRepository>;
  });

  // ---------------------------------------------------------------------------
  // TEST: create a league
  // ---------------------------------------------------------------------------
  // This is the "happy path" for league creation. It tests that:
  // 1. create calls the repo's createLeague with the right DTO
  // 2. The returned value matches what the repo returned
  //
  // Notice we also need to mock findOneLeague and createLeagueSettings.
  // Why? Because service.create() internally calls createLeagueSettings(),
  // which internally calls findOneLeague() to determine the sportLeague
  // and create the correct default positions. Even though we don't care
  // about positions in THIS test, we have to mock them so the code doesn't
  // crash on undefined.
  //
  // This is a common friction point in testing: the mock setup can feel
  // excessive for what you're actually testing. But it reveals coupling —
  // if create() has too many side effects, the test setup becomes unwieldy,
  // which is a smell that the method might need refactoring.
  it('should create a league', async () => {
    repo.createLeague.mockResolvedValue(mockLeague);
    repo.findOneLeague.mockResolvedValue(mockLeague as any);
    repo.createLeagueSettings.mockResolvedValue({ leagueSettingsId: 'settings-uuid', leagueId: 'uuid-1', scoringType: 'PPR' } as any);
    const result = await service.create({ name: 'Test League', sportLeague: SportLeague.NFL });
    expect(result).toEqual(mockLeague);
    expect(repo.createLeague).toHaveBeenCalledWith({ name: 'Test League', sportLeague: SportLeague.NFL });
  });

  it('should find all leagues', async () => {
    repo.findAllLeagues.mockResolvedValue([mockLeague]);
    const result = await service.findAll();
    expect(result).toEqual([mockLeague]);
  });

  it('should find a league by id', async () => {
    repo.findOneLeague.mockResolvedValue(mockLeague);
    const result = await service.findOne('uuid-1');
    expect(result).toEqual(mockLeague);
    expect(repo.findOneLeague).toHaveBeenCalledWith('uuid-1');
  });

  // ---------------------------------------------------------------------------
  // TEST: negative path - not found
  // ---------------------------------------------------------------------------
  // This tests what happens when the league doesn't exist. The service should
  // throw a NotFoundException, not return null or silently fail.
  //
  // Key pattern: when a mock resolves to null, the service hits its "not found"
  // branch and throws. We use rejects.toThrow to assert the promise rejects.
  //
  // Why test this? If the service silently returned null, the controller would
  // send a 204 No Content instead of 404 Not Found. The frontend would have
  // no way to distinguish "league exists but is empty" from "league doesn't
  // exist." Consistent error handling matters.
  it('should throw NotFoundException if league not found', async () => {
    repo.findOneLeague.mockResolvedValue(null);
    await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should update a league', async () => {
    const updatedLeague = { ...mockLeague, name: 'Updated' };
    repo.updateLeague.mockResolvedValue(updatedLeague);
    const result = await service.update('uuid-1', { name: 'Updated' });
    expect(result).toEqual(updatedLeague);
    expect(repo.updateLeague).toHaveBeenCalledWith('uuid-1', { name: 'Updated' });
  });

  // ---------------------------------------------------------------------------
  // TEST: update failure
  // ---------------------------------------------------------------------------
  // Same pattern as "find not found" — if the repo returns null (no rows
  // affected), the service throws NotFoundException. This protects the
  // API from silently returning an outdated or non-existent resource.
  it('should throw NotFoundException if update fails', async () => {
    repo.updateLeague.mockResolvedValue(null);
    await expect(service.update('uuid-1', { name: 'Updated' })).rejects.toThrow(NotFoundException);
  });

  it('should remove a league', async () => {
    repo.deleteLeague.mockResolvedValue(true);
    await expect(service.remove('uuid-1')).resolves.toBeUndefined();
    expect(repo.deleteLeague).toHaveBeenCalledWith('uuid-1');
  });

  it('should throw NotFoundException if remove fails', async () => {
    repo.deleteLeague.mockResolvedValue(false);
    await expect(service.remove('uuid-1')).rejects.toThrow(NotFoundException);
  });

  // ---------------------------------------------------------------------------
  // TEST: league users (CRUD for members)
  // ---------------------------------------------------------------------------
  // These tests are straightforward "pass-through" tests — the service just
  // delegates to the repo with the same args and returns whatever the repo
  // returns. The tests verify the delegation is correct.
  //
  // Are these tests useful? Debatable. They catch regressions if someone
  // accidentally transforms the DTO or adds logic, but mostly they exist
  // because the project convention says "every endpoint gets a test."
  // If these feel low-value, you're not wrong — but they serve as anchors
  // that force you to think about the method signature when changing code.
  it('should find league users', async () => {
    const users = [{ userId: 'u1', name: 'Alice' }];
    repo.findLeagueUsers.mockResolvedValue(users as any);
    const result = await service.findLeagueUsers('uuid-1');
    expect(result).toEqual(users);
    expect(repo.findLeagueUsers).toHaveBeenCalledWith('uuid-1');
  });

  it('should add a league user', async () => {
    const userDto = { userId: 'u1', role: 'member' };
    repo.addLeagueUser.mockResolvedValue(userDto as any);
    const result = await service.addLeagueUser('uuid-1', userDto);
    expect(result).toEqual(userDto);
    expect(repo.addLeagueUser).toHaveBeenCalledWith('uuid-1', userDto);
  });

  it('should remove a league user', async () => {
    repo.removeLeagueUser.mockResolvedValue(true);
    const result = await service.removeLeagueUser('uuid-1', 'u1');
    expect(result).toBe(true);
    expect(repo.removeLeagueUser).toHaveBeenCalledWith('uuid-1', 'u1');
  });

  it('should update a league user', async () => {
    const updateDto = { role: 'admin' };
    repo.updateLeagueUser.mockResolvedValue(updateDto as any);
    const result = await service.updateLeagueUser('uuid-1', 'u1', updateDto);
    expect(result).toEqual(updateDto);
    expect(repo.updateLeagueUser).toHaveBeenCalledWith('uuid-1', 'u1', updateDto);
  });

  it('should get league teams', async () => {
    const teams: ITeam[] = [{ teamId: 't1', leagueId: 'uuid-1', userId: 'u1', seasonYear: 2025, eventGroupId: 'event-group-1', players: [] }];
    repo.findLeagueTeams.mockResolvedValue(teams);
    const result = await service.getLeagueTeams('uuid-1');
    expect(result).toEqual(teams);
    expect(repo.findLeagueTeams).toHaveBeenCalledWith('uuid-1');
  });

  // ---------------------------------------------------------------------------
  // TEST: World Cup default positions
  // ---------------------------------------------------------------------------
  // This test was added alongside the createDefaultWorldCupPositions method.
  // It tests that creating a WORLDCUP league triggers position creation with
  // the correct pool sizes for all four positions (GK, DEF, MID, FWD).
  //
  // Why a separate test instead of extending the existing "should create a
  // league" test? Because each test should verify ONE behavior. The first
  // test tests that create() returns the league correctly. This test tests
  // that the correct positions are created as a side effect. If we merged
  // them, a failure would be harder to diagnose: "did the create fail or did
  // the positions fail?"
  //
  // Pattern notes:
  // - We construct the DTO with sportLeague: 'WORLDCUP' to trigger the
  //   World Cup branch in createLeagueSettings
  // - We mock findOneLeague to return the created league (createLeagueSettings
  //   calls findOne to check sportLeague)
  // - We mock createLeagueSettings to return a settings object (required for
  //   the position creation to get the leagueSettingsId)
  // - createLeagueSettingsPosition returns {} as any because we don't care
  //   about the return value — we use toHaveBeenCalledWith to verify the input
  //
  // The assertions check:
  // 1. Each position was created with the correct poolSize
  // 2. Exactly 4 positions were created (no extras, no missing)
  //    If someone accidentally adds a 5th position, toHaveBeenCalledTimes(4)
  //    will catch it
  it('should create default World Cup positions when league is WORLDCUP', async () => {
    const leagueDto = { name: 'WC League', sportLeague: SportLeague.WORLDCUP };
    const createdLeague = { leagueId: 'uuid-wc', ...leagueDto };
    const createdSettings = { leagueSettingsId: 'settings-uuid', leagueId: 'uuid-wc', scoringType: 'PPR' };

    const worldCupPositions = [
      { position: 'GK', poolSize: 48 },
      { position: 'DEF', poolSize: 168 },
      { position: 'MID', poolSize: 240 },
      { position: 'FWD', poolSize: 120 },
    ];
    mockStrategy.getDefaultPositions.mockReturnValue(worldCupPositions);

    repo.createLeague.mockResolvedValue(createdLeague as any);
    repo.findOneLeague.mockResolvedValue(createdLeague as any);
    repo.createLeagueSettings.mockResolvedValue(createdSettings as any);
    repo.createLeagueSettingsPosition.mockResolvedValue({} as any);

    await service.create(leagueDto);

    expect(repo.createLeagueSettingsPosition).toHaveBeenCalledWith('settings-uuid', { position: 'GK', poolSize: 48 });
    expect(repo.createLeagueSettingsPosition).toHaveBeenCalledWith('settings-uuid', { position: 'DEF', poolSize: 168 });
    expect(repo.createLeagueSettingsPosition).toHaveBeenCalledWith('settings-uuid', { position: 'MID', poolSize: 240 });
    expect(repo.createLeagueSettingsPosition).toHaveBeenCalledWith('settings-uuid', { position: 'FWD', poolSize: 120 });
    expect(repo.createLeagueSettingsPosition).toHaveBeenCalledTimes(4);
  });
});
