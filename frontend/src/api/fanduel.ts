import { request } from './client';

interface GolfEvent {
  id: string;
  name: string;
}

export interface EnrichedGolfEvent {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  state: 'pre' | 'in' | 'post' | null;
}

export const getGolfEvents = () =>
  request<GolfEvent[]>('/fanduel/GOLF/events');

export const getGolfEventsEnriched = (year?: string | number) =>
  request<EnrichedGolfEvent[]>(`/fanduel/GOLF/events/enriched${year ? `?year=${year}` : ''}`);
