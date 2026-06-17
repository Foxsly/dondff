import { GolfTeamsGameStrategy } from './golf-teams-game.strategy';
import { IPlayerProjection } from '@/player-stats/entities/player-stats.entity';
import { ITeam } from '@/teams/entities/team.entity';

describe('GolfTeamsGameStrategy', () => {
  let strategy: GolfTeamsGameStrategy;

  beforeEach(() => {
    strategy = new GolfTeamsGameStrategy();
  });

  describe('usesSharedPlayerPool', () => {
    it('returns true', () => {
      // Golf uses a shared pool: every user drafts from the same set of PGA
      // golfers. Unlike NFL, a golfer is not exclusive to one team's roster.
      expect(strategy.usesSharedPlayerPool()).toBe(true);
    });
  });

  describe('getNumberOfCases', () => {
    it('always returns 10', () => {
      // Golf uses a fixed 10-case Deal or No Deal board, independent of
      // roster size or season. The `{} as any` team param is unused.
      expect(strategy.getNumberOfCases({} as any)).toBe(10);
    });
  });

  describe('getExcludedPlayerIds', () => {
    it('excludes players whose position differs from currentPosition', async () => {
      // Each roster slot (GOLF_PLAYER_1/2/3) tracks its own assigned players.
      // When drafting for GOLF_PLAYER_1, only players already in
      // GOLF_PLAYER_2 slots should be excluded (they're occupied for this user).
      // Players in other GOLF_PLAYER_1 slots are eligible again.
      const team: ITeam = {
        teamId: 'team-1',
        leagueId: 'league-1',
        userId: 'user-1',
        seasonYear: 2025,
        eventGroupId: 'eg-1',
        players: [
          { teamId: 'team-1', position: 'GOLF_PLAYER_1', playerId: 'p1', playerName: 'A', projectedPoints: 100 },
          { teamId: 'team-1', position: 'GOLF_PLAYER_2', playerId: 'p2', playerName: 'B', projectedPoints: 90 },
          { teamId: 'team-1', position: 'GOLF_PLAYER_1', playerId: 'p3', playerName: 'C', projectedPoints: 95 },
        ],
      };

      const excluded = await strategy.getExcludedPlayerIds(team, 'GOLF_PLAYER_1');

      // Only p2 (GOLF_PLAYER_2) should be excluded; p1 and p3 are GOLF_PLAYER_1
      expect(excluded).toEqual(['p2']);
    });

    it('returns empty array when all players match current position', async () => {
      const team: ITeam = {
        teamId: 'team-2',
        leagueId: 'league-1',
        userId: 'user-1',
        seasonYear: 2025,
        eventGroupId: 'eg-1',
        players: [
          { teamId: 'team-2', position: 'GOLF_PLAYER_1', playerId: 'p1', playerName: 'A', projectedPoints: 100 },
          { teamId: 'team-2', position: 'GOLF_PLAYER_1', playerId: 'p3', playerName: 'C', projectedPoints: 95 },
        ],
      };

      const excluded = await strategy.getExcludedPlayerIds(team, 'GOLF_PLAYER_1');
      expect(excluded).toEqual([]);
    });

    it('returns empty array when team has no players', async () => {
      const team: ITeam = {
        teamId: 'team-3',
        leagueId: 'league-1',
        userId: 'user-1',
        seasonYear: 2025,
        eventGroupId: 'eg-1',
        players: [],
      };

      const excluded = await strategy.getExcludedPlayerIds(team, 'GOLF_PLAYER_1');
      expect(excluded).toEqual([]);
    });
  });

  describe('determinePlayerPool', () => {
    const makeProjection = (
      id: string,
      projectedPoints: number,
    ): IPlayerProjection => ({
      playerId: id,
      name: `Player ${id}`,
      position: 'GOLF_PLAYER' as IPlayerProjection['position'],
      team: '',
      projectedPoints,
    });

    it('excludes players from other positions and returns top N', async () => {
      const projections = [
        makeProjection('p1', 10),
        makeProjection('p2', 30),
        makeProjection('p3', 20),
      ];
      const team: ITeam = {
        teamId: 'team-1',
        leagueId: 'league-1',
        userId: 'user-1',
        seasonYear: 2025,
        eventGroupId: 'eg-1',
        players: [
          { teamId: 'team-1', position: 'GOLF_PLAYER_2', playerId: 'p2', playerName: 'B', projectedPoints: 90 },
        ],
      };

      const pool = await strategy.determinePlayerPool(projections, team, 'GOLF_PLAYER_1', 5);

      // p2 excluded (different position), so pool = [p3 (30), p1 (10)]
      expect(pool).toHaveLength(2);
      expect(pool.map(p => p.playerId)).toEqual(['p3', 'p1']);
    });

    it('returns all eligible when no overlapping positions', async () => {
      const projections = [
        makeProjection('p1', 10),
        makeProjection('p2', 5),
      ];
      const team: ITeam = {
        teamId: 'team-2',
        leagueId: 'league-1',
        userId: 'user-1',
        seasonYear: 2025,
        eventGroupId: 'eg-1',
        players: [],
      };

      const pool = await strategy.determinePlayerPool(projections, team, 'GOLF_PLAYER_1', 5);

      expect(pool).toHaveLength(2);
    });

    it('returns empty when all projections are excluded', async () => {
      const projections = [makeProjection('p1', 10)];
      const team: ITeam = {
        teamId: 'team-3',
        leagueId: 'league-1',
        userId: 'user-1',
        seasonYear: 2025,
        eventGroupId: 'eg-1',
        players: [
          { teamId: 'team-3', position: 'GOLF_PLAYER_2', playerId: 'p1', playerName: 'A', projectedPoints: 100 },
        ],
      };

      const pool = await strategy.determinePlayerPool(projections, team, 'GOLF_PLAYER_1', 5);

      expect(pool).toEqual([]);
    });
  });

  describe('normalizePlayerName', () => {
    it('delegates to normalizeName from golf-scoring.util', () => {
      // Delegating to golf-scoring.util centralises all name-matching logic
      // (strip suffixes, handle accents) so providers (FanDuel, ESPN) can
      // be matched by player name even when formatting differs.
      expect(strategy.normalizePlayerName('Rory McIlroy Jr')).toBe('rory mcilroy');
    });
  });
});
