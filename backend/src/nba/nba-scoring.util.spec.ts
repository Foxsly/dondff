import { calculateNbaFantasyPoints } from './nba-scoring.util';

describe('calculateNbaFantasyPoints', () => {
  // Real Sleeper stat lines (2025 week 10) alongside Sleeper's own pts_std.
  it.each([
    ['Cade Cunningham 2025-12-22', { pts: 14, reb: 6, ast: 9, stl: 1, to: 5, tpm: 1 }, 19.5],
    [
      'Cade Cunningham 2025-12-23 (double-double)',
      { pts: 23, reb: 7, ast: 14, stl: 5, to: 9, tpm: 2, dd: 1 },
      35.5,
    ],
    [
      '56-point triple-double with every bonus',
      {
        pts: 56,
        reb: 16,
        ast: 15,
        blk: 2,
        to: 5,
        tpm: 4,
        dd: 1,
        td: 1,
        bonus_pt_40p: 1,
        bonus_pt_50p: 1,
      },
      67,
    ],
  ])('matches Sleeper pts_std for %s', (_label, stats, expected) => {
    expect(calculateNbaFantasyPoints(stats)).toBe(expected);
  });

  it('ignores rebound/assist bonus fields, which are worth 0 in pts_std', () => {
    const stats = { pts: 22, reb: 1, ast: 15, stl: 2, to: 1, tpm: 1, dd: 1, bonus_ast_15p: 1 };
    expect(calculateNbaFantasyPoints(stats)).toBe(31.5);
  });

  it('scores an empty stat line (did not play) as 0', () => {
    expect(calculateNbaFantasyPoints({})).toBe(0);
  });

  it('uses dd/td probabilities as expected value on projections, rounded to 2dp', () => {
    const projection = {
      pts: 17.53,
      reb: 5.28,
      ast: 5.94,
      stl: 0.8,
      blk: 0.41,
      to: 2.69,
      tpm: 1.43,
      dd: 0.16,
      td: 0.03,
    };
    // 8.765 + 5.28 + 5.94 + 1.6 + 0.82 - 2.69 + 0.715 + 0.16 + 0.06 = 20.65
    expect(calculateNbaFantasyPoints(projection)).toBe(20.65);
  });
});
