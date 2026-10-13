/**
 * NBA event groups are Sleeper NBA fantasy weeks (Monday–Sunday). Sleeper
 * numbers regular-season and playoff weeks separately (both from 1), and
 * event-group lookup matches on name alone, so the name carries the season
 * and season type: "NBA 2025-26 Week 10", "NBA 2025-26 Playoffs Week 1".
 */
export type NbaSeasonType = 'regular' | 'post';

export interface NbaWeek {
  seasonYear: number;
  seasonType: NbaSeasonType;
  week: number;
}

const NBA_WEEK_NAME = /^NBA (\d{4})-\d{2} (Playoffs )?Week (\d+)$/;

export const buildNbaWeekName = ({ seasonYear, seasonType, week }: NbaWeek): string => {
  const season = `${seasonYear}-${String((seasonYear + 1) % 100).padStart(2, '0')}`;
  return `NBA ${season} ${seasonType === 'post' ? 'Playoffs ' : ''}Week ${week}`;
};

export const parseNbaWeekName = (name: string): NbaWeek => {
  const match = name.match(NBA_WEEK_NAME);
  if (!match) {
    throw new Error(`Cannot resolve NBA week from event group: ${name}`);
  }
  return {
    seasonYear: parseInt(match[1], 10),
    seasonType: match[2] ? 'post' : 'regular',
    week: parseInt(match[3], 10),
  };
};
