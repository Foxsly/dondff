import { NflTeamsGameStrategy } from './nfl-teams-game.strategy';
import { ITeam } from '@/teams/entities/team.entity';
import { IPlayerProjection } from '@/player-stats/entities/player-stats.entity';

describe('NflTeamsGameStrategy', () => {
  let strategy: NflTeamsGameStrategy;

  beforeEach(() => {
    strategy = new NflTeamsGameStrategy();
  });

  describe('determinePlayerPool', () => {
    const makeProjection = (
      id: string,
      projectedPoints: number,
    ): IPlayerProjection => ({
      playerId: id,
      name: `Player ${id}`,
      position: 'QB',
      team: 'KC',
      projectedPoints,
    });

    it('returns top N projections sorted by projected points', async () => {
      const projections = [
        makeProjection('p1', 10),
        makeProjection('p2', 30),
        makeProjection('p3', 20),
        makeProjection('p4', 5),
      ];
      const team = { players: [] } as unknown as ITeam;

      const pool = await strategy.determinePlayerPool(projections, team, 'QB', 2);

      expect(pool).toHaveLength(2);
      expect(pool[0].playerId).toBe('p2');
      expect(pool[1].playerId).toBe('p3');
    });

    it('returns fewer when eligible list is smaller than poolSize', async () => {
      const projections = [makeProjection('p1', 10), makeProjection('p2', 5)];
      const team = { players: [] } as unknown as ITeam;

      const pool = await strategy.determinePlayerPool(projections, team, 'QB', 10);

      expect(pool).toHaveLength(2);
    });

    it('returns empty array when no projections provided', async () => {
      const team = { players: [] } as unknown as ITeam;

      const pool = await strategy.determinePlayerPool([], team, 'QB', 5);

      expect(pool).toEqual([]);
    });
  });
});
