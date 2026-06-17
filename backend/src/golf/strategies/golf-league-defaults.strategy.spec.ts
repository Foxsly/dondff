import { GolfLeagueDefaultsStrategy } from './golf-league-defaults.strategy';

describe('GolfLeagueDefaultsStrategy', () => {
  let strategy: GolfLeagueDefaultsStrategy;

  beforeEach(() => {
    strategy = new GolfLeagueDefaultsStrategy();
  });

  describe('getDefaultPositions', () => {
    it('returns three GOLF_PLAYER positions with poolSize 150', () => {
      const positions = strategy.getDefaultPositions();

      // Golf has 3 identical roster slots (GOLF_PLAYER_1/2/3) because all golfers
      // compete in the same pool regardless of skill — no positional split like
      // QB/RB/WR in NFL. Pool of 150 covers PGA Tour field sizes.
      expect(positions).toEqual([
        { position: 'GOLF_PLAYER_1', poolSize: 150 },
        { position: 'GOLF_PLAYER_2', poolSize: 150 },
        { position: 'GOLF_PLAYER_3', poolSize: 150 },
      ]);
    });
  });
});
