import type { SportLeague } from '../types';
import type { SportConfig } from './types';
import { nflConfig } from './nfl';
import { golfConfig } from './golf';

const configs: Record<string, SportConfig> = {
  NFL: nflConfig,
  GOLF: golfConfig,
};

export const getSportConfig = (sport: SportLeague): SportConfig => {
  const config = configs[sport];
  if (!config) throw new Error(`Unknown sport: ${sport}`);
  return config;
};

export const getAllSports = (): SportConfig[] => Object.values(configs);
