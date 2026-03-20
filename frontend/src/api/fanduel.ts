import { request } from './client';

interface GolfEvent {
  id: string;
  name: string;
}

export const getGolfEvents = () =>
  request<GolfEvent[]>('/fanduel/GOLF/events');
