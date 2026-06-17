import {
  scoreHole,
  scoreRoundBonuses,
  getPositionBonus,
  calculateGolferScore,
  normalizeName,
  EspnCompetitor,
  EspnHoleScore,
} from './golf-scoring.util';

describe('scoreHole', () => {
  // Hole scoring mirrors standard golf DFS scoring. Key design decisions:
  // - Eagle-or-better caps at 7 points (no incremental reward for -4+)
  // - Double-bogey-or-worse floors at -3 (avoids unlimited downside)
  // - Birdie (3.1) is worth more than par (0.5) to reward aggressive play
  // - Bogey (-1) is a mild penalty; double-bogey (-3) is harsher

  it('scores Eagle or better (-2) as 7 points, under par', () => {
    const result = scoreHole('-2');
    expect(result.points).toBe(7);
    expect(result.isUnderPar).toBe(true);
    expect(result.isOverPar).toBe(false);
  });

  it('scores -3 as 7 points (eagle or better)', () => {
    const result = scoreHole('-3');
    expect(result.points).toBe(7);
    expect(result.isUnderPar).toBe(true);
  });

  it('scores Birdie (-1) as 3.1 points, under par', () => {
    const result = scoreHole('-1');
    expect(result.points).toBe(3.1);
    expect(result.isUnderPar).toBe(true);
    expect(result.isOverPar).toBe(false);
  });

  it('scores Par (E) as 0.5 points, neither under nor over', () => {
    const result = scoreHole('E');
    expect(result.points).toBe(0.5);
    expect(result.isUnderPar).toBe(false);
    expect(result.isOverPar).toBe(false);
  });

  it('scores Bogey (+1) as -1 point, over par', () => {
    const result = scoreHole('+1');
    expect(result.points).toBe(-1);
    expect(result.isUnderPar).toBe(false);
    expect(result.isOverPar).toBe(true);
  });

  it('scores Double Bogey or worse (+2) as -3 points, over par', () => {
    const result = scoreHole('+2');
    expect(result.points).toBe(-3);
    expect(result.isUnderPar).toBe(false);
    expect(result.isOverPar).toBe(true);
  });

  it('scores +3 as -3 points', () => {
    const result = scoreHole('+3');
    expect(result.points).toBe(-3);
  });

  it('scores OTHER as 0 points', () => {
    // Some ESPN hole entries use "OTHER" for incomplete/stalled holes
    const result = scoreHole('OTHER');
    expect(result.points).toBe(0);
    expect(result.isUnderPar).toBe(false);
    expect(result.isOverPar).toBe(false);
  });

  it('trims whitespace from score type', () => {
    // ESPN data occasionally includes leading/trailing whitespace
    const result = scoreHole('  -1  ');
    expect(result.points).toBe(3.1);
  });

  it('returns 0 for unrecognised score type', () => {
    const result = scoreHole('XYZ');
    expect(result.points).toBe(0);
  });
});

describe('scoreRoundBonuses', () => {
  // Round bonuses reward patterns of play, not just individual hole scores.
  // Three independent bonus types:
  //   1. Bogey-free round: +5 for 18+ holes with no over-par scores
  //   2. Streak: +0.6 per consecutive under-par hole (from the 2nd onward)
  //   3. Bounce-back: +0.3 for an under-par hole immediately after an over-par
  // Also: +4 for 5+ under-par holes in a round (volume bonus)
  //
  // The 18-hole threshold for bogey-free prevents partial-round false positives.

  const makeHoles = (types: string[]): EspnHoleScore[] =>
    types.map((scoreType, i) => ({ holeNumber: i + 1, scoreType }));

  it('returns 0 for a 3-hole all-par round (no bogey-free bonus)', () => {
    const holes = makeHoles(['E', 'E', 'E']);
    expect(scoreRoundBonuses(holes)).toBe(0);
  });

  it('awards +5 bogey-free bonus for 18 all-par holes', () => {
    const holes = makeHoles(Array(18).fill('E'));
    expect(scoreRoundBonuses(holes)).toBe(5);
  });

  it('awards streak bonus for consecutive under-par holes', () => {
    // 4 under-par holes in a row: streak kicks in on the 2nd, 3rd, 4th = 3 × 0.6
    const holes = makeHoles(['-1', '-1', '-1', '-1']);
    expect(scoreRoundBonuses(holes)).toBeCloseTo(1.8);
  });

  it('does not award streak bonus for a single under-par hole', () => {
    // Streak starts at 2 consecutive under-par holes. A lone birdie with
    // pars around it is just a good hole, not a streak.
    const holes = makeHoles(['-1', 'E', 'E']);
    expect(scoreRoundBonuses(holes)).toBe(0);
  });

  it('resets streak after an over-par hole but still awards bounce-back', () => {
    // Hole 1: under (-1) → streak=1, no bonus. underParCount=1
    // Hole 2: over (+1) → streak reset. overParCount=1. prevOverPar=true
    // Hole 3: under (-1) → streak=1, no bonus. bounce-back +0.3. underParCount=2
    // Hole 4: under (-1) → streak=2, bonus +0.6. underParCount=3
    // Total bonuses: 0.3 (bounce-back) + 0.6 (streak) = 0.9
    const holes = makeHoles(['-1', '+1', '-1', '-1']);
    expect(scoreRoundBonuses(holes)).toBeCloseTo(0.9);
  });

  it('awards bounce-back bonus for under-par immediately after over-par', () => {
    const holes = makeHoles(['+1', '-1']);
    // Bounce back: +0.3
    expect(scoreRoundBonuses(holes)).toBeCloseTo(0.3);
  });

  it('awards both streak and bounce-back on the same hole', () => {
    // Hole 1: over (+1)
    // Hole 2: under (-1) — bounce-back (+0.3), streak=1 no streak bonus yet
    // Hole 3: under (-1) — streak=2 gives +0.6
    const holes = makeHoles(['+1', '-1', '-1']);
    expect(scoreRoundBonuses(holes)).toBeCloseTo(0.9); // 0.3 bounce-back + 0.6 streak
  });

  it('awards +4 for 5+ under-par holes in a round', () => {
    const holes = makeHoles(['-1', '-1', '-1', '-1', '-1', 'E', 'E']);
    // 5 under-par holes → +4 bonus
    // Streak bonus: holes 2,3,4,5 consecutive under → 4 × 0.6 = 2.4
    // Total = 4 + 2.4 = 6.4
    expect(scoreRoundBonuses(holes)).toBeCloseTo(6.4);
  });

  it('awards +5 for bogey-free 18-hole round', () => {
    const holes = makeHoles(Array(18).fill('E'));
    expect(scoreRoundBonuses(holes)).toBe(5);
  });

  it('does not award bogey-free bonus for less than 18 holes', () => {
    const holes = makeHoles(Array(9).fill('E'));
    expect(scoreRoundBonuses(holes)).toBe(0);
  });

  it('does not award bogey-free bonus if any over-par hole exists', () => {
    const holes = makeHoles([...Array(17).fill('E'), '+1']);
    expect(scoreRoundBonuses(holes)).not.toBeCloseTo(5);
  });
});

describe('getPositionBonus', () => {
  // Position bonus is a fixed payout by tournament finish position.
  // Winner gets 30, then nonlinear decrements for top 10. The drop-off
  // slows after 10th: bands of 5-10 positions share the same bonus.
  // This keeps the bonus meaningful for near-the-money finishes without
  // over-rewarding 41st+. Null/negative positions score 0 (cut missed,
  // withdrew, or data not yet available).
  it('awards 30 for 1st place', () => expect(getPositionBonus(1)).toBe(30));
  it('awards 20 for 2nd place', () => expect(getPositionBonus(2)).toBe(20));
  it('awards 18 for 3rd place', () => expect(getPositionBonus(3)).toBe(18));
  it('awards 16 for 4th place', () => expect(getPositionBonus(4)).toBe(16));
  it('awards 14 for 5th place', () => expect(getPositionBonus(5)).toBe(14));
  it('awards 12 for 6th place', () => expect(getPositionBonus(6)).toBe(12));
  it('awards 10 for 7th place', () => expect(getPositionBonus(7)).toBe(10));
  it('awards 8 for 8th place', () => expect(getPositionBonus(8)).toBe(8));
  it('awards 7 for 9th place', () => expect(getPositionBonus(9)).toBe(7));
  it('awards 6 for 10th place', () => expect(getPositionBonus(10)).toBe(6));
  it('awards 5 for 11th-15th', () => {
    expect(getPositionBonus(11)).toBe(5);
    expect(getPositionBonus(15)).toBe(5);
  });
  it('awards 4 for 16th-20th', () => {
    expect(getPositionBonus(16)).toBe(4);
    expect(getPositionBonus(20)).toBe(4);
  });
  it('awards 3 for 21st-25th', () => {
    expect(getPositionBonus(21)).toBe(3);
    expect(getPositionBonus(25)).toBe(3);
  });
  it('awards 2 for 26th-30th', () => {
    expect(getPositionBonus(26)).toBe(2);
    expect(getPositionBonus(30)).toBe(2);
  });
  it('awards 1 for 31st-40th', () => {
    expect(getPositionBonus(31)).toBe(1);
    expect(getPositionBonus(40)).toBe(1);
  });
  it('awards 0 for 41st+', () => {
    expect(getPositionBonus(41)).toBe(0);
    expect(getPositionBonus(100)).toBe(0);
  });
  it('awards 0 for null position', () => expect(getPositionBonus(null)).toBe(0));
  it('awards 0 for negative position', () => expect(getPositionBonus(-1)).toBe(0));
});

describe('calculateGolferScore', () => {
  // calculateGolferScore is the top-level scoring function. It aggregates:
  //   roundTotal = sum(scoreHole) + scoreRoundBonuses
  //   totalScore = sum(roundTotals) + getPositionBonus
  // This test verifies the integration of all sub-functions end-to-end.

  it('calculates total score for a competitor with multiple rounds', () => {
    // Two rounds: first round has 2 birdies + 1 par, second round has 1 eagle
    const competitor: EspnCompetitor = {
      athleteName: 'Test Golfer',
      position: null,
      rounds: [
        {
          roundNumber: 1,
          holes: [
            { holeNumber: 1, scoreType: '-1' },   // 3.1
            { holeNumber: 2, scoreType: '-1' },   // 3.1 (streak +0.6)
            { holeNumber: 3, scoreType: 'E' },     // 0.5
          ],
        },
        {
          roundNumber: 2,
          holes: [
            { holeNumber: 1, scoreType: '-2' },   // 7
            { holeNumber: 2, scoreType: 'E' },     // 0.5
          ],
        },
      ],
    };

    // Round 1: holes 3.1+3.1+0.5 = 6.7, bonuses = 0.6 (streak) = 0.6, round total = 7.3
    // Round 2: holes 7+0.5 = 7.5, bonuses = 0, round total = 7.5
    // Position bonus = 0
    // Total = 7.3 + 7.5 = 14.8
    expect(calculateGolferScore(competitor)).toBeCloseTo(14.8);
  });

  it('includes position bonus when position is provided', () => {
    const competitor: EspnCompetitor = {
      athleteName: 'Winner',
      position: 1,
      rounds: [{ roundNumber: 1, holes: [{ holeNumber: 1, scoreType: 'E' }] }],
    };
    // 0.5 for par hole + 30 position bonus = 30.5
    expect(calculateGolferScore(competitor)).toBeCloseTo(30.5);
  });
});

describe('normalizeName', () => {
  // normalizeName bridges name differences between FanDuel and ESPN.
  // Both providers can format the same golfer's name differently:
  // - FanDuel might have "Rory McIlroy", ESPN might have "Rory McIlroy Jr"
  // - Accented and Scandinavian characters must be decomposed
  // - Suffixes (Jr, Sr, II, III, IV) must be stripped
  // - "Rafa Cabrera-Bello" vs "Rafa Cabrera Bello" (hyphen vs space)
  // The pipeline: lowercase → NFD decompose → strip combining marks →
  //   strip punctuation → remove suffixes → collapse whitespace

  it('lowercases and strips non-alphanumeric characters', () => {
    expect(normalizeName('Rory McIlroy')).toBe('rory mcilroy');
  });

  it('strips suffix like Jr, Sr, II, III, IV', () => {
    // ESPN suffixes entries with generational suffix; FanDuel does not.
    // The name must match without them.
    expect(normalizeName('Patrick Smith Jr')).toBe('patrick smith');
    expect(normalizeName('John Doe III')).toBe('john doe');
    expect(normalizeName('Bob Brown Sr')).toBe('bob brown');
  });

  it('handles accented characters', () => {
    // NFD decomposition splits "í" into "i" + combining accent, then
    // the accent is stripped by the combining-marks regex. Same for ñ → n.
    expect(normalizeName('Joaquín Niemann')).toBe('joaquin niemann');
    expect(normalizeName('Rafa Cabrera-Bello')).toBe('rafa cabrerabello');
  });

  it('handles special Scandinavian characters', () => {
    // ð (eth) and ø are Latin letters that decompose through NFD.
    // æ → "ae" via manual mapping (not in NFD).
    // ß → "ss" via manual mapping.
    // Þ (thorn) is a standalone letter that gets stripped by the
    // non-alphanumeric filter (it's not a combining mark).
    expect(normalizeName('Thomas Bjørn')).toBe('thomas bjorn');
    expect(normalizeName('Ægir')).toBe('aegir');
    expect(normalizeName('Þór')).toBe('or');
    expect(normalizeName('Groß')).toBe('gross');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeName('  Jon   Rahm  ')).toBe('jon rahm');
  });
});
