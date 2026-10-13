import { buildNbaWeekName, parseNbaWeekName } from './nba-week.util';

describe('NBA week names', () => {
  it.each([
    [{ seasonYear: 2026, seasonType: 'regular' as const, week: 3 }, 'NBA 2026-27 Week 3'],
    [{ seasonYear: 2025, seasonType: 'post' as const, week: 1 }, 'NBA 2025-26 Playoffs Week 1'],
    [{ seasonYear: 2099, seasonType: 'regular' as const, week: 12 }, 'NBA 2099-00 Week 12'],
  ])('round-trips %j as "%s"', (week, name) => {
    expect(buildNbaWeekName(week)).toBe(name);
    expect(parseNbaWeekName(name)).toEqual(week);
  });

  it.each(['NFL Week 3', 'NBA Week 3', 'NBA 2026-27 Week', 'NBA 2026-27 Week 3 (copy)'])(
    'rejects "%s"',
    (name) => {
      expect(() => parseNbaWeekName(name)).toThrow(/Cannot resolve NBA week/);
    },
  );
});
