/**
 * FanDuel Fantasy Golf Scoring Utility
 *
 * Scoring rules from https://www.fanduel.com/fantasy-golf#scoring
 * Pure stateless functions — no NestJS dependencies.
 */

export interface EspnHoleScore {
  holeNumber: number;
  scoreType: string; // "-2", "-1", "E", "+1", "+2", "+3", "OTHER"
}

export interface EspnRoundScore {
  roundNumber: number;
  holes: EspnHoleScore[];
}

export interface EspnCompetitor {
  athleteName: string;
  position: number | null;
  rounds: EspnRoundScore[];
}

// --- Per-Hole Scoring ---

interface HoleResult {
  points: number;
  isUnderPar: boolean;
  isOverPar: boolean;
}

export function scoreHole(scoreType: string): HoleResult {
  const val = scoreType.trim();
  if (val === 'E') return { points: 0.5, isUnderPar: false, isOverPar: false };
  if (val === 'OTHER') return { points: 0, isUnderPar: false, isOverPar: false };

  const num = parseInt(val, 10);
  if (isNaN(num)) return { points: 0, isUnderPar: false, isOverPar: false };

  if (num <= -2) return { points: 7, isUnderPar: true, isOverPar: false };   // Eagle or better
  if (num === -1) return { points: 3.1, isUnderPar: true, isOverPar: false }; // Birdie
  if (num === 1) return { points: -1, isUnderPar: false, isOverPar: true };   // Bogey
  // +2 or worse
  return { points: -3, isUnderPar: false, isOverPar: true };
}

// --- Round Bonuses ---

export function scoreRoundBonuses(holes: EspnHoleScore[]): number {
  let bonus = 0;
  let consecutiveUnderPar = 0;
  let underParCount = 0;
  let overParCount = 0;
  let prevOverPar = false;

  for (const hole of holes) {
    const result = scoreHole(hole.scoreType);

    // Streak bonus: +0.6 for each consecutive under-par hole (starting from the 2nd in a row)
    if (result.isUnderPar) {
      consecutiveUnderPar++;
      if (consecutiveUnderPar >= 2) {
        bonus += 0.6;
      }
    } else {
      consecutiveUnderPar = 0;
    }

    // Bounce back: +0.3 for under-par immediately after over-par
    if (result.isUnderPar && prevOverPar) {
      bonus += 0.3;
    }

    if (result.isUnderPar) underParCount++;
    if (result.isOverPar) overParCount++;
    prevOverPar = result.isOverPar;
  }

  // 5+ Birdies: +4 for a round with 5+ under-par holes
  if (underParCount >= 5) {
    bonus += 4;
  }

  // Bogey-Free Round: +5 for no over-par holes
  if (overParCount === 0 && holes.length === 18) {
    bonus += 5;
  }

  return bonus;
}

// --- Finishing Position Bonus ---

const POSITION_BONUS_MAP: Record<number, number> = {
  1: 30, 2: 20, 3: 18, 4: 16, 5: 14, 6: 12, 7: 10, 8: 8, 9: 7, 10: 6,
};

export function getPositionBonus(position: number | null): number {
  if (position == null || position < 1) return 0;
  if (position <= 10) return POSITION_BONUS_MAP[position];
  if (position <= 15) return 5;
  if (position <= 20) return 4;
  if (position <= 25) return 3;
  if (position <= 30) return 2;
  if (position <= 40) return 1;
  return 0;
}

// --- Full Golfer Score ---

export function calculateGolferScore(competitor: EspnCompetitor): number {
  let total = 0;

  for (const round of competitor.rounds) {
    // Per-hole points
    for (const hole of round.holes) {
      total += scoreHole(hole.scoreType).points;
    }
    // Round bonuses
    total += scoreRoundBonuses(round.holes);
  }

  // Finishing position bonus
  total += getPositionBonus(competitor.position);

  return Math.round(total * 100) / 100;
}

// --- Name Normalization ---

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
