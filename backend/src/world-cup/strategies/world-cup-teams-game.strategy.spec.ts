import { WorldCupTeamsGameStrategy } from './world-cup-teams-game.strategy';
import { ITeam } from '@/teams/entities/team.entity';
import { IPlayerProjection } from '@/player-stats/entities/player-stats.entity';

describe('WorldCupTeamsGameStrategy', () => {
  let strategy: WorldCupTeamsGameStrategy;

  beforeEach(() => {
    strategy = new WorldCupTeamsGameStrategy();
  });

  const makeProjection = (
    id: string,
    position: string,
    team: string,
    projectedPoints: number,
  ): IPlayerProjection => ({
    playerId: id,
    name: `Player ${id}`,
    position: position as IPlayerProjection['position'],
    team,
    projectedPoints,
  });

  describe('determinePlayerPool', () => {
    it('only includes 1 GK per country (quota)', async () => {
      const projections = [
        makeProjection('arg1', 'GK', 'ARG', 10),
        makeProjection('arg2', 'GK', 'ARG', 8),
        makeProjection('bra1', 'GK', 'BRA', 9),
        makeProjection('bra2', 'GK', 'BRA', 7),
      ];
      const team = { players: [] } as unknown as ITeam;

      // poolSize matches quota sum (2 countries × 1 GK each)
      const pool = await strategy.determinePlayerPool(projections, team, 'GK', 2);

      expect(pool).toHaveLength(2);
      expect(pool.map(p => p.playerId).sort()).toEqual(['arg1', 'bra1']);
    });

    it('only includes 2 DEF per country (quota)', async () => {
      const projections = [
        makeProjection('arg1', 'DEF', 'ARG', 10),
        makeProjection('arg2', 'DEF', 'ARG', 9),
        makeProjection('arg3', 'DEF', 'ARG', 8),
        makeProjection('bra1', 'DEF', 'BRA', 7),
        makeProjection('bra2', 'DEF', 'BRA', 6),
      ];

      // poolSize matches quota sum (2 countries × 2 DEF each)
      const pool = await strategy.determinePlayerPool(projections, {} as ITeam, 'DEF', 4);

      expect(pool).toHaveLength(4);
      expect(pool.map(p => p.playerId).sort()).toEqual(['arg1', 'arg2', 'bra1', 'bra2']);
    });

    it('fills remaining slots with best unselected players up to poolSize', async () => {
      const projections = [
        makeProjection('arg1', 'GK', 'ARG', 10),
        makeProjection('arg2', 'GK', 'ARG', 9),
        makeProjection('bra1', 'GK', 'BRA', 3),
        makeProjection('bra2', 'GK', 'BRA', 1),
        makeProjection('uru1', 'GK', 'URU', 10),
        makeProjection('uru2', 'GK', 'URU', 10),
      ];

      // 3 countries × 1 GK quota = 3, poolSize 5 → remainder fills 2 slot with best (uru2, arg2)
      const pool = await strategy.determinePlayerPool(projections, {} as ITeam, 'GK', 5);

      expect(pool).toHaveLength(5);
      expect(pool).toEqual(['arg1', 'bra1', 'uru1', 'uru2', 'arg2'].map(id =>
        expect.objectContaining({ playerId: id }),
      ));
    });

    it('does not add more players than poolSize from remainder', async () => {
      const projections = [
        makeProjection('arg1', 'GK', 'ARG', 10),
        makeProjection('arg2', 'GK', 'ARG', 9),
        makeProjection('bra1', 'GK', 'BRA', 8),
        makeProjection('uru1', 'GK', 'URU', 6),
      ];

      // 3 countries × 1 GK quota = 3, poolSize 3 → no remainder fill
      const pool = await strategy.determinePlayerPool(projections, {} as ITeam, 'GK', 3);

      expect(pool).toHaveLength(3);
      expect(pool.map(p => p.playerId).sort()).toEqual(['arg1', 'bra1', 'uru1']);
    });

    it('does not duplicate players between quota and remainder', async () => {
      const projections = [
        makeProjection('arg1', 'GK', 'ARG', 10),
        makeProjection('arg2', 'GK', 'ARG', 9),
        makeProjection('bra1', 'GK', 'BRA', 8),
        makeProjection('bra2', 'GK', 'BRA', 7),
      ];

      const pool = await strategy.determinePlayerPool(projections, {} as ITeam, 'GK', 10);

      const ids = pool.map(p => p.playerId);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('handles all projections from a single country', async () => {
      const projections = [
        makeProjection('p1', 'DEF', 'ARG', 10),
        makeProjection('p2', 'DEF', 'ARG', 9),
        makeProjection('p3', 'DEF', 'ARG', 6),
        makeProjection('p4', 'DEF', 'ARG', 7),
      ];

      const pool = await strategy.determinePlayerPool(projections, {} as ITeam, 'DEF', 3);

      expect(pool).toHaveLength(3);
      expect(pool.map(p => p.playerId)).toEqual(['p1', 'p2', 'p4']);
    });

    it('returns fewer players when total eligible is less than poolSize', async () => {
      const projections = [
        makeProjection('p1', 'GK', 'ARG', 10),
        makeProjection('p2', 'GK', 'BRA', 8),
      ];

      const pool = await strategy.determinePlayerPool(projections, {} as ITeam, 'GK', 10);

      expect(pool).toHaveLength(2);
    });

    it('returns empty array when no projections provided', async () => {
      const pool = await strategy.determinePlayerPool([], {} as ITeam, 'GK', 5);

      expect(pool).toEqual([]);
    });
  });
});
