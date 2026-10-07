import { NbaEventSyncStrategy } from './nba-event-sync.strategy';
import { SleeperService } from '@/external-providers/sleeper/sleeper.service';
import {
  ISleeperNbaGame,
  ISleeperNbaState,
} from '@/external-providers/sleeper/entities/sleeper-nba.entity';

const game = (id: string, date: string, away: string, home: string): ISleeperNbaGame => ({
  game_id: id,
  date,
  status: 'pre_game',
  start_time: 0,
  metadata: { away_team: { team: away }, home_team: { team: home } },
});

describe('NbaEventSyncStrategy', () => {
  let sleeper: { getNbaState: jest.Mock; getNbaWeekGames: jest.Mock };
  let strategy: NbaEventSyncStrategy;

  const state = (overrides: Partial<ISleeperNbaState>) =>
    sleeper.getNbaState.mockResolvedValue({
      week: 1,
      season: '2025',
      season_type: 'regular',
      ...overrides,
    });

  beforeEach(() => {
    sleeper = { getNbaState: jest.fn(), getNbaWeekGames: jest.fn() };
    strategy = new NbaEventSyncStrategy(sleeper as unknown as SleeperService);
  });

  it('syncs the current and next regular-season week, one event per game', async () => {
    state({ week: 10 });
    sleeper.getNbaWeekGames
      .mockResolvedValueOnce([
        game('g1', '2025-12-22', 'DET', 'BOS'),
        game('g2', '2025-12-28', 'CLE', 'NYK'),
      ])
      .mockResolvedValueOnce([game('g3', '2025-12-29', 'MIA', 'ORL')]);

    const groups = await strategy.fetchSyncData();

    expect(sleeper.getNbaWeekGames.mock.calls).toEqual([
      [2025, 10, 'regular'],
      [2025, 11, 'regular'],
    ]);
    expect(groups.map((g) => [g.name, g.seasonYear, g.events.length])).toEqual([
      ['NBA 2025-26 Week 10', 2025, 2],
      ['NBA 2025-26 Week 11', 2025, 1],
    ]);
    expect(groups[0].events[0]).toEqual({
      externalId: 'g1',
      externalSource: 'SLEEPER',
      name: 'DET @ BOS',
      startDate: '2025-12-22',
      endDate: '2025-12-22',
    });
  });

  it('skips a week with no games', async () => {
    state({ week: 25 });
    sleeper.getNbaWeekGames
      .mockResolvedValueOnce([game('g1', '2026-04-12', 'DET', 'BOS')])
      .mockResolvedValueOnce([]);

    const groups = await strategy.fetchSyncData();

    expect(groups.map((g) => g.name)).toEqual(['NBA 2025-26 Week 25']);
  });

  it('syncs regular-season week 1 during the preseason', async () => {
    state({ week: 2, season: '2026', season_type: 'pre' });
    sleeper.getNbaWeekGames.mockResolvedValueOnce([game('g1', '2026-10-20', 'BOS', 'DET')]);

    const groups = await strategy.fetchSyncData();

    expect(sleeper.getNbaWeekGames).toHaveBeenCalledTimes(1);
    expect(sleeper.getNbaWeekGames).toHaveBeenCalledWith(2026, 1, 'regular');
    expect(groups.map((g) => [g.name, g.seasonYear])).toEqual([['NBA 2026-27 Week 1', 2026]]);
  });

  it('names playoff weeks separately', async () => {
    state({ week: 1, season_type: 'post' });
    sleeper.getNbaWeekGames
      .mockResolvedValueOnce([game('g1', '2026-04-14', 'MIA', 'CHI')])
      .mockResolvedValueOnce([]);

    const groups = await strategy.fetchSyncData();

    expect(sleeper.getNbaWeekGames).toHaveBeenCalledWith(2025, 1, 'post');
    expect(groups.map((g) => g.name)).toEqual(['NBA 2025-26 Playoffs Week 1']);
  });

  it('syncs nothing in the off-season', async () => {
    state({ season_type: 'off' });

    expect(await strategy.fetchSyncData()).toEqual([]);
    expect(sleeper.getNbaWeekGames).not.toHaveBeenCalled();
  });
});
