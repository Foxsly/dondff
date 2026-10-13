import { NbaTeamsGameStrategy } from './nba-teams-game.strategy';
import { ITeam } from '@/teams/entities/team.entity';
import { IPlayerProjection } from '@/player-stats/entities/player-stats.entity';

const projection = (playerId: string, projectedPoints: number): IPlayerProjection => ({
  playerId,
  name: `Player ${playerId}`,
  position: 'F',
  team: 'DET',
  projectedPoints,
});

const teamWith = (players: Array<{ position: string; playerId: string }>) =>
  ({ players: players.map((p) => ({ ...p, playerName: p.playerId })) }) as unknown as ITeam;

describe('NbaTeamsGameStrategy', () => {
  const strategy = new NbaTeamsGameStrategy();

  it('excludes players drafted at another slot, but not the current slot', async () => {
    const team = teamWith([
      { position: 'G', playerId: 'wing' },
      { position: 'F', playerId: 'current' },
    ]);

    expect(await strategy.getExcludedPlayerIds(team, 'F')).toEqual(['wing']);
  });

  it('builds the pool from the top projections, without already-drafted players', async () => {
    const team = teamWith([{ position: 'G', playerId: 'wing' }]);
    const pool = await strategy.determinePlayerPool(
      [projection('a', 10), projection('wing', 50), projection('b', 30), projection('c', 20)],
      team,
      'F',
      2,
    );

    expect(pool.map((p) => p.playerId)).toEqual(['b', 'c']);
  });

  it('uses 10 cases', () => {
    expect(strategy.getNumberOfCases({} as never)).toBe(10);
  });
});
