import { request } from './client';

export interface EventGroup {
  eventGroupId: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
}

export const getEventGroups = () =>
  request<EventGroup[]>('/event-groups');

export const createEventGroup = (body: { name: string; startDate?: string | null; endDate?: string | null }) =>
  request<EventGroup>('/event-groups', { method: 'POST', body });

export const getOrCreateEventGroup = async (
  name: string,
  dates?: { startDate?: string | null; endDate?: string | null },
): Promise<EventGroup> => {
  return request<EventGroup>('/event-groups/get-or-create', {
    method: 'POST',
    body: {
      name,
      startDate: dates?.startDate ?? null,
      endDate: dates?.endDate ?? null,
    },
  });
};
