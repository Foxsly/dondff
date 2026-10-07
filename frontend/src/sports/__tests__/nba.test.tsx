import { render, screen } from '@testing-library/react';
import { getEventGroupsBySportLeagueWithDates, type EventGroup } from '../../api/events';
import { nbaConfig, pickCurrentNbaWeek } from '../nba';
import { getAllSports, getSportConfig } from '../registry';

jest.mock('../../api/events', () => ({
  getEventGroupsBySportLeagueWithDates: jest.fn(),
}));

const mockGroups = getEventGroupsBySportLeagueWithDates as jest.MockedFunction<
  typeof getEventGroupsBySportLeagueWithDates
>;

const week = (
  name: string,
  seasonYear: number,
  status: EventGroup['status'],
  startDate: string,
): EventGroup => ({
  eventGroupId: name,
  name,
  sportLeague: 'NBA',
  seasonYear,
  status,
  startDate,
  endDate: startDate,
});

describe('nbaConfig', () => {
  afterEach(() => mockGroups.mockReset());

  it('is registered, so NBA can be picked when creating a league', () => {
    expect(getSportConfig('NBA')).toBe(nbaConfig);
    expect(getAllSports().map((s) => s.key)).toContain('NBA');
  });

  describe('pickCurrentNbaWeek', () => {
    const finished = week('NBA 2026-27 Week 2', 2026, 'FINISHED', '2026-10-26');
    const playing = week('NBA 2026-27 Week 3', 2026, 'PLAYING', '2026-11-02');
    const next = week('NBA 2026-27 Week 4', 2026, 'PENDING', '2026-11-09');
    const later = week('NBA 2026-27 Week 5', 2026, 'PENDING', '2026-11-16');

    it('prefers the week in progress', () => {
      expect(pickCurrentNbaWeek([finished, next, playing])).toBe(playing);
    });

    it('falls back to the next week to start', () => {
      expect(pickCurrentNbaWeek([later, finished, next])).toBe(next);
    });

    it('returns null when every week is over', () => {
      expect(pickCurrentNbaWeek([finished])).toBeNull();
    });
  });

  it("takes the season from the current week, not today's year", async () => {
    mockGroups.mockResolvedValue([
      week('NBA 2025-26 Week 25', 2025, 'FINISHED', '2026-04-06'),
      week('NBA 2026-27 Week 12', 2026, 'PLAYING', '2027-01-11'),
    ]);

    await expect(nbaConfig.fetchCurrentSeason()).resolves.toBe('2026');
    await expect(nbaConfig.fetchCurrentEventGroup()).resolves.toEqual({
      eventGroupId: 'NBA 2026-27 Week 12',
      label: 'NBA 2026-27 Week 12',
    });
  });

  it('falls back to the latest season, or null when nothing is synced or the request fails', async () => {
    mockGroups.mockResolvedValueOnce([week('NBA 2025-26 Week 25', 2025, 'FINISHED', '2026-04-06')]);
    await expect(nbaConfig.fetchCurrentSeason()).resolves.toBe('2025');

    mockGroups.mockRejectedValueOnce(new Error('offline'));
    await expect(nbaConfig.fetchCurrentSeason()).resolves.toBeNull();
    mockGroups.mockRejectedValueOnce(new Error('offline'));
    await expect(nbaConfig.fetchCurrentEventGroup()).resolves.toBeNull();
  });

  it('lists only the requested season as available weeks', async () => {
    mockGroups.mockResolvedValue([
      week('NBA 2025-26 Week 25', 2025, 'FINISHED', '2026-04-06'),
      week('NBA 2026-27 Week 1', 2026, 'PENDING', '2026-10-20'),
    ]);

    const options = await nbaConfig.fetchAvailableEventGroups(2026);

    expect(options.map((o) => o.label)).toEqual(['NBA 2026-27 Week 1']);
  });

  it('names and orders the positions guard, forward, center', () => {
    expect(nbaConfig.positionOrder).toEqual(['G', 'F', 'C']);
    expect(nbaConfig.positionOrder!.map(nbaConfig.getPositionDisplayName)).toEqual([
      'Guard',
      'Forward',
      'Center',
    ]);
  });

  it("shows a player's games for the week and best projected game", () => {
    render(
      <p>
        {nbaConfig.renderPlayerDetails({
          playerId: 'cade',
          playerName: 'Cade Cunningham',
          projectedPoints: 41.2,
          injuryStatus: null,
          matchup: { team: 'DET', opponent: 'BOS, MIA, NYK' },
        } as any)}
      </p>,
    );

    expect(screen.getByText(/DET · 3 games vs BOS, MIA, NYK/)).toBeInTheDocument();
    expect(screen.getByText(/Best game proj 41.2/)).toBeInTheDocument();
  });

  it('omits the game count when the matchup is unknown', () => {
    render(
      <p>
        {nbaConfig.renderOfferDetails({
          projectedPoints: 20,
          matchup: { team: 'NA', opponent: 'NA' },
        } as any)}
      </p>,
    );

    expect(screen.queryByText(/\d+ games? vs/)).not.toBeInTheDocument();
  });
});
