import { request } from './client';

interface SleeperState {
  season: string | number;
  week: string | number;
}

export const getSleeperState = () =>
  request<SleeperState>('/sleeper/state');
