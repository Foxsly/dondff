import { request } from './client';
import type { GameBox, GameOffer } from '../types';

interface CasesResponse {
  boxes: GameBox[];
  players: any[];
}

interface SelectCaseResponse {
  offer: GameOffer;
  boxes: GameBox[];
}

interface OfferActionResponse {
  offer: GameOffer;
  boxes: GameBox[];
}

interface FinalDecisionResponse {
  boxes: GameBox[];
}

export const createTeam = (body: { leagueId: string; userId: string; seasonYear: number; week: number }) =>
  request<any>('/teams', { method: 'POST', body });

export const getTeam = (teamId: string) =>
  request<any>(`/teams/${teamId}`);

export const getTeamEntries = (teamId: string) =>
  request<any[]>(`/teams/${teamId}/entry`);

export const getTeamStatus = (teamId: string) =>
  request<{ playable: boolean }>(`/teams/${teamId}/status`);

export const getCases = (teamId: string, position: string) =>
  request<CasesResponse>(`/teams/${teamId}/cases?position=${position}`);

export const selectCase = (teamId: string, body: { position: string; boxNumber: number }) =>
  request<SelectCaseResponse>(`/teams/${teamId}/cases`, { method: 'POST', body });

export const resetCases = (teamId: string, body: { position: string }) =>
  request<CasesResponse>(`/teams/${teamId}/cases/reset`, { method: 'POST', body });

export const getCurrentOffer = (teamId: string, position: string) =>
  request<GameOffer>(`/teams/${teamId}/offers?position=${position}`);

export const acceptOffer = (teamId: string, body: { position: string }) =>
  request<OfferActionResponse>(`/teams/${teamId}/offers/accept`, { method: 'POST', body });

export const rejectOffer = (teamId: string, body: { position: string }) =>
  request<OfferActionResponse>(`/teams/${teamId}/offers/reject`, { method: 'POST', body });

export const finalDecision = (teamId: string, body: { position: string; decision: 'keep' | 'swap' }) =>
  request<FinalDecisionResponse>(`/teams/${teamId}/offers`, { method: 'POST', body });
