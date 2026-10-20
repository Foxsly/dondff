import { SportLeague } from '@/common/types/sport-league.type';
import { NbaEventSyncStrategy } from './nba-event-sync.strategy';
import { SleeperService } from '@/external-providers/sleeper/sleeper.service';
import {
  ISleeperState,
  SleeperScheduleResponse,
} from '@/external-providers/sleeper/entities/sleeper.entity';

const game = (
  id: string,
  week: number,
  date: string,
  away: string,
  home: string,
  status = 'pre_game',
): SleeperScheduleResponse[number] => ({
  game_id: id,
  date,
  week,
  status,
  home,
  away,
});

describe('NbaEventSyncStrategy', () => {
  let sleeper: { getStateForSport: jest.Mock; getScheduleForSport: jest.Mock };
  let strategy: NbaEventSyncStrategy;

  const state = (overrides: Partial<ISleeperState>) =>
    sleeper.getStateForSport.mockResolvedValue({
      week: 1,
      season: '2025',
      season_type: 'regular',
      ...overrides,
    });

  beforeEach(() => {
    sleeper = { getStateForSport: jest.fn(), getScheduleForSport: jest.fn() };
    strategy = new NbaEventSyncStrategy(sleeper as unknown as SleeperService);
  });

  it('syncs the current and next regular-season week, one event per game', async () => {
    state({ week: 10 });
    sleeper.getScheduleForSport.mockResolvedValueOnce([
      game('g0', 9, '2025-12-21', 'LAL', 'GSW'),
      game('g1', 10, '2025-12-22', 'DET', 'BOS'),
      game('g2', 10, '2025-12-28', 'CLE', 'NYK'),
      game('g3', 11, '2025-12-29', 'MIA', 'ORL'),
      game('g4', 12, '2026-01-05', 'PHX', 'DEN'),
    ]);

    const groups = await strategy.fetchSyncData();

    expect(sleeper.getScheduleForSport.mock.calls).toEqual([[SportLeague.NBA, 2025, 'regular']]);
    expect(groups.map((g) => [g.name, g.seasonYear, g.events.map((e) => e.externalId)])).toEqual([
      ['NBA 2025-26 Week 10', 2025, ['g1', 'g2']],
      ['NBA 2025-26 Week 11', 2025, ['g3']],
    ]);
    expect(groups[0].events[0]).toEqual({
      externalId: 'g1',
      externalSource: 'SLEEPER',
      name: 'DET @ BOS',
      startDate: '2025-12-22',
      endDate: '2025-12-22',
    });
  });

  it('skips canceled games but keeps postponed ones', async () => {
    state({ week: 17 });
    sleeper.getScheduleForSport.mockResolvedValueOnce([
      game('allstar', 17, '2026-02-15', 'STR', 'STP', 'canceled'),
      game('g1', 17, '2026-02-12', 'DET', 'BOS', 'complete'),
      game('g2', 17, '2026-02-13', 'CHI', 'MIA', 'postponed'),
    ]);

    const groups = await strategy.fetchSyncData();

    expect(groups[0].events.map((e) => e.externalId)).toEqual(['g1', 'g2']);
  });

  it('skips a week with no games, or only canceled ones', async () => {
    state({ week: 25 });
    sleeper.getScheduleForSport.mockResolvedValueOnce([game('g1', 25, '2026-04-12', 'DET', 'BOS')]);

    expect((await strategy.fetchSyncData()).map((g) => g.name)).toEqual(['NBA 2025-26 Week 25']);

    state({ week: 3, season_type: 'post' });
    sleeper.getScheduleForSport.mockResolvedValueOnce([
      game('g1', 3, '2026-04-27', 'NYK', 'ATL', 'complete'),
      game('g7', 4, '2026-05-04', 'NYK', 'ATL', 'canceled'),
    ]);

    expect((await strategy.fetchSyncData()).map((g) => g.name)).toEqual([
      'NBA 2025-26 Playoffs Week 3',
    ]);
  });

  it('syncs regular-season week 1 during the preseason', async () => {
    state({ week: 2, season: '2026', season_type: 'pre' });
    sleeper.getScheduleForSport.mockResolvedValueOnce([
      game('g1', 1, '2026-10-20', 'BOS', 'DET'),
      game('g2', 2, '2026-10-26', 'BOS', 'NYK'),
    ]);

    const groups = await strategy.fetchSyncData();

    expect(sleeper.getScheduleForSport).toHaveBeenCalledWith(SportLeague.NBA, 2026, 'regular');
    expect(groups.map((g) => [g.name, g.seasonYear, g.events.length])).toEqual([
      ['NBA 2026-27 Week 1', 2026, 1],
    ]);
  });

  it('names playoff weeks separately', async () => {
    state({ week: 1, season_type: 'post' });
    sleeper.getScheduleForSport.mockResolvedValueOnce([game('g1', 1, '2026-04-14', 'MIA', 'CHI')]);

    const groups = await strategy.fetchSyncData();

    expect(sleeper.getScheduleForSport).toHaveBeenCalledWith(SportLeague.NBA, 2025, 'post');
    expect(groups.map((g) => g.name)).toEqual(['NBA 2025-26 Playoffs Week 1']);
  });

  it('syncs nothing in the off-season', async () => {
    state({ season_type: 'off' });

    expect(await strategy.fetchSyncData()).toEqual([]);
    expect(sleeper.getScheduleForSport).not.toHaveBeenCalled();
  });
});
