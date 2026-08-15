import { request } from './client';
import type { League, LeagueMember, LeaguePosition, SportLeague } from '../types';

export const getLeague = (leagueId: string) =>
  request<League>(`/leagues/${leagueId}`);

export const createLeague = (body: { name: string; sportLeague: string }) =>
  request<League>('/leagues', { method: 'POST', body });

/** Partial update. The backend accepts any subset of the league fields. */
export const updateLeague = (
  leagueId: string,
  body: { name?: string; sportLeague?: SportLeague },
) => request<League>(`/leagues/${leagueId}`, { method: 'PATCH', body });

export const deleteLeague = (leagueId: string) =>
  request<void>(`/leagues/${leagueId}`, { method: 'DELETE' });

export const getLeagueUsers = (leagueId: string) =>
  request<LeagueMember[]>(`/leagues/${leagueId}/users`);

export const addLeagueUser = (leagueId: string, body: { userId: string; role: string }) =>
  request<void>(`/leagues/${leagueId}/users`, { method: 'PUT', body });

/** Change a member's role. The backend takes only `role`. */
export const updateLeagueUser = (leagueId: string, userId: string, body: { role: string }) =>
  request<LeagueMember>(`/leagues/${leagueId}/users/${userId}`, { method: 'PUT', body });

export const removeLeagueUser = (leagueId: string, userId: string) =>
  request<boolean>(`/leagues/${leagueId}/users/${userId}`, { method: 'DELETE' });

export const getLeagueTeams = (leagueId: string, params?: { season?: string | number; eventGroupId?: string }) => {
  const query = new URLSearchParams();
  if (params?.season != null) query.set('season', String(params.season));
  if (params?.eventGroupId != null) query.set('eventGroupId', params.eventGroupId);
  const qs = query.toString();
  return request<any[]>(`/leagues/${leagueId}/teams${qs ? `?${qs}` : ''}`);
};

export const getLeaguePositions: (leagueId: string) => Promise<LeaguePosition[]> = (leagueId: string) =>
  request<LeaguePosition[]>(`/leagues/${leagueId}/positions`);
