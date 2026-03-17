import { request } from './client';

export const getProjections = (season: string | number, week: string | number, position: string) =>
  request<any[]>(`/players/projections/${season}/${week}/${position}`);

export const getStats = (season: string | number, week: string | number, position: string) =>
  request<any[]>(`/players/stats/${season}/${week}/${position}`);
