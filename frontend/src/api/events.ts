import { request } from './client';

export interface EventGroup {
  eventGroupId: string;
  name: string;
}

export const getEventGroups = () =>
  request<EventGroup[]>('/event-groups');

export const createEventGroup = (body: { name: string }) =>
  request<EventGroup>('/event-groups', { method: 'POST', body });

export const getOrCreateEventGroup = async (name: string): Promise<EventGroup> => {
  const groups = await getEventGroups();
  const existing = groups.find((g) => g.name === name);
  if (existing) return existing;
  return createEventGroup({ name });
};
