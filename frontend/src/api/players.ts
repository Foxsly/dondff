import { request } from './client';
import type { SportLeague } from '../types';

export const getProjections = (season: string | number, eventGroupId: string, position: string, sportLeague?: SportLeague) => {
  const query = sportLeague ? `?sportLeague=${sportLeague}` : '';
  return request<any[]>(`/players/projections/${season}/${eventGroupId}/${position}${query}`);
};

export const getStats = (season: string | number, eventGroupId: string, position: string) =>
  request<any[]>(`/players/stats/${season}/${eventGroupId}/${position}`);
