import { request } from './client';

export interface EventGroup {
  eventGroupId: string;
  name: string;
  sportLeague: string;
  startDate: string | Date | null;
  endDate: string | Date | null;
}

export const getEventGroups = () =>
  request<EventGroup[]>('/event-groups');

export const createEventGroup = (body: { name: string; sportLeague: string }) =>
  request<EventGroup>('/event-groups', { method: 'POST', body });

export const getOrCreateEventGroup = async (
  name: string,
  sportLeague: string,
): Promise<EventGroup> => {
  return request<EventGroup>('/event-groups/get-or-create', {
    method: 'POST',
    body: {
      name,
      sportLeague,
    },
  });
};
