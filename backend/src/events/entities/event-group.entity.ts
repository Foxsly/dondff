import { Selectable } from 'kysely';
import { tags } from 'typia';

export interface IEventGroup {
  eventGroupId: string & tags.Format<'uuid'>;
  name: string;
  startDate: string | null;
  endDate: string | null;
}

export type EventGroup = Selectable<IEventGroup>;
export type CreateEventGroupDto = Omit<IEventGroup, 'eventGroupId'>;
export type UpdateEventGroupDto = Partial<CreateEventGroupDto>;
