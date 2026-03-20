import { request } from './client';
import type { SportLeague } from '../types';

export const getProjections = (season: string | number, week: string | number, position: string, sportLeague?: SportLeague) => {
  const query = sportLeague ? `?sportLeague=${sportLeague}` : '';
  return request<any[]>(`/players/projections/${season}/${week}/${position}${query}`);
};

export const getStats = (season: string | number, week: string | number, position: string) =>
  request<any[]>(`/players/stats/${season}/${week}/${position}`);
