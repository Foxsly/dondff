import { request } from './client';
import type { User, League } from '../types';

export const getUser = (userId: string) =>
  request<User>(`/users/${userId}`);

export const getUserLeagues = (userId: string) =>
  request<League[]>(`/users/${userId}/leagues`);
