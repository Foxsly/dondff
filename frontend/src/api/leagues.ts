import { request } from './client';
import type { League, LeagueMember, LeaguePosition } from '../types';

export const getLeague = (leagueId: string) =>
  request<League>(`/leagues/${leagueId}`);

export const createLeague = (body: { name: string; sportLeague: string }) =>
  request<League>('/leagues', { method: 'POST', body });

export const getLeagueUsers = (leagueId: string) =>
  request<LeagueMember[]>(`/leagues/${leagueId}/users`);

export const addLeagueUser = (leagueId: string, body: { userId: string; role: string }) =>
  request<void>(`/leagues/${leagueId}/users`, { method: 'PUT', body });

export const getLeagueTeams = (leagueId: string, params?: { season?: string | number; week?: string | number }) => {
  const query = new URLSearchParams();
  if (params?.season != null) query.set('season', String(params.season));
  if (params?.week != null) query.set('week', String(params.week));
  const qs = query.toString();
  return request<any[]>(`/leagues/${leagueId}/teams${qs ? `?${qs}` : ''}`);
};

export const getLeaguePositions = (leagueId: string) =>
  request<LeaguePosition[]>(`/leagues/${leagueId}/positions`);
