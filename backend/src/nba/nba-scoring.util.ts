/**
 * NBA fantasy scoring — Sleeper's default points scoring ("pts_std").
 *
 * Sleeper returns `pts_std` on actual stat lines but not on projections, so
 * projections are scored here with the same weights. The weights reproduce
 * Sleeper's `pts_std` exactly for completed games (rebound and assist
 * bonuses are worth 0 in that format). On a projection, `dd`/`td` are
 * probabilities, so they contribute their expected value; Sleeper does not
 * project the 40/50-point bonuses, so those contribute nothing there.
 *
 * Pure stateless functions — no NestJS dependencies.
 */
import { ISleeperNbaStatLine } from '@/external-providers/sleeper/entities/sleeper-nba.entity';

export const NBA_STD_SCORING: Readonly<Record<keyof ISleeperNbaStatLine, number>> = {
  pts: 0.5,
  reb: 1,
  ast: 1,
  stl: 2,
  blk: 2,
  to: -1,
  tpm: 0.5,
  dd: 1,
  td: 2,
  bonus_pt_40p: 2,
  bonus_pt_50p: 2,
};

/** Fantasy points for one game's stat line, rounded to 2 decimal places. */
export const calculateNbaFantasyPoints = (stats: ISleeperNbaStatLine): number => {
  const total = (Object.keys(NBA_STD_SCORING) as (keyof ISleeperNbaStatLine)[]).reduce(
    (sum, stat) => sum + (stats[stat] ?? 0) * NBA_STD_SCORING[stat],
    0,
  );
  return Math.round(total * 100) / 100;
};
