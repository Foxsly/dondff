import { request } from './client';

export interface EventGroup {
  eventGroupId: string;
  name: string;
  sportLeague: string;
  startDate: string | Date | null;
  endDate: string | Date | null;
}

export const getEventGroupsBySportLeague = (sportLeague: string) =>
  request<EventGroup[]>(`/event-groups/${sportLeague}`);

export const getEventGroupsBySportLeagueWithDates = (sportLeague: string) =>
  request<EventGroup[]>(`/event-groups/${sportLeague}/with-dates`);

export const getEventGroupById = (id: string) =>
  request<EventGroup>(`/event-groups/group/${id}`);

export const getEventGroupByIdWithDates = (id: string) =>
  request<EventGroup>(`/event-groups/group/${id}/with-dates`);

export const createEventGroup = (body: { name: string; sportLeague: string }) =>
  request<EventGroup>('/event-groups', { method: 'POST', body });
