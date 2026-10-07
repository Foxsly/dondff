import { NbaPlayerStatsStrategy } from './nba-player-stats.strategy';
import { SleeperService } from '@/external-providers/sleeper/sleeper.service';
import {
  ISleeperNbaPlayerEntry,
  SleeperNbaPosition,
} from '@/external-providers/sleeper/entities/sleeper-nba.entity';
import { EventGroup } from '@/events/entities/event-group.entity';

const row = <TStats>(
  playerId: string,
  name: string,
  positions: SleeperNbaPosition[],
  date: string,
  opponent: string,
  stats: TStats,
): ISleeperNbaPlayerEntry<TStats> => {
  const [first_name, last_name] = name.split(' ');
  return {
    stats,
    week: 10,
    season: 2025,
    season_type: 'regular',
    sport: 'nba',
    player_id: playerId,
    player: {
      first_name,
      last_name,
      fantasy_positions: positions,
      position: positions[0],
      injury_status: null,
    },
    team: 'DET',
    opponent,
    game_id: `${playerId}-${date}`,
    date,
  };
};

const eventGroup = { name: 'NBA 2025-26 Week 10', seasonYear: 2025 } as EventGroup;

describe('NbaPlayerStatsStrategy', () => {
  let sleeper: { getNbaProjections: jest.Mock; getNbaStatistics: jest.Mock };
  let strategy: NbaPlayerStatsStrategy;

  beforeEach(() => {
    sleeper = { getNbaProjections: jest.fn(), getNbaStatistics: jest.fn() };
    strategy = new NbaPlayerStatsStrategy(sleeper as unknown as SleeperService);
  });

  describe('getProjections', () => {
    beforeEach(() => {
      sleeper.getNbaProjections.mockResolvedValue([
        // Given out of date order: oppTeam must still be chronological
        row('cade', 'Cade Cunningham', ['PG'], '2025-12-26', 'MIA', { pts: 30 }), // 15
        row('cade', 'Cade Cunningham', ['PG'], '2025-12-22', 'BOS', { pts: 20, ast: 10 }), // 20
        row('jd', 'Jalen Duren', ['C', 'PF'], '2025-12-22', 'BOS', { pts: 10, reb: 12 }), // 17
        row('ausar', 'Ausar Thompson', ['SF', 'SG'], '2025-12-22', 'BOS', { pts: 12 }), // 6
      ]);
    });

    it('scores each projected game with pts_std and keeps the best game', async () => {
      const result = await strategy.getProjections(2025, eventGroup, [], 'G');

      expect(sleeper.getNbaProjections).toHaveBeenCalledWith(2025, 10, 'regular');
      expect(result).toEqual([
        {
          playerId: 'cade',
          name: 'Cade Cunningham',
          position: 'G',
          projectedPoints: 20,
          injuryStatus: null,
          oppTeam: 'BOS, MIA',
          team: 'DET',
        },
        expect.objectContaining({ playerId: 'ausar', position: 'G', projectedPoints: 6 }),
      ]);
    });

    it('puts a multi-position player in every pool they are eligible for', async () => {
      const forwards = await strategy.getProjections(2025, eventGroup, [], 'F');
      const centers = await strategy.getProjections(2025, eventGroup, [], 'C');

      expect(forwards.map((p) => p.playerId)).toEqual(['jd', 'ausar']);
      expect(centers.map((p) => p.playerId)).toEqual(['jd']);
      expect(centers[0].position).toBe('C');
    });

    it('throws for an event group that is not an NBA week', async () => {
      const bad = { name: 'NFL Week 3', seasonYear: 2025 } as EventGroup;
      await expect(strategy.getProjections(2025, bad, [], 'G')).rejects.toThrow(
        /Cannot resolve NBA week/,
      );
      expect(sleeper.getNbaProjections).not.toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it("returns each player's best actual game, for every position", async () => {
      sleeper.getNbaStatistics.mockResolvedValue([
        row('cade', 'Cade Cunningham', ['PG'], '2025-12-22', 'BOS', { pts_std: 12 }),
        row('cade', 'Cade Cunningham', ['PG'], '2025-12-23', 'MIA', { pts_std: 31 }),
        row('cade', 'Cade Cunningham', ['PG'], '2025-12-26', 'NYK', { pts_std: 22 }),
        row('jd', 'Jalen Duren', ['C', 'PF'], '2025-12-22', 'BOS', { pts_std: 0 }),
      ]);

      const result = await strategy.getStatistics(2025, eventGroup, [], 'G');

      expect(sleeper.getNbaStatistics).toHaveBeenCalledWith(2025, 10, 'regular');
      expect(result).toEqual([
        {
          playerId: 'cade',
          name: 'Cade Cunningham',
          position: 'G',
          points: 31,
          oppTeam: 'BOS, MIA, NYK',
          team: 'DET',
        },
        expect.objectContaining({ playerId: 'jd', points: 0 }),
      ]);
    });

    it('reads playoff weeks with the post season type', async () => {
      sleeper.getNbaStatistics.mockResolvedValue([]);
      const playoffs = { name: 'NBA 2025-26 Playoffs Week 2', seasonYear: 2025 } as EventGroup;

      await strategy.getStatistics(2025, playoffs, [], 'C');

      expect(sleeper.getNbaStatistics).toHaveBeenCalledWith(2025, 2, 'post');
    });
  });
});
