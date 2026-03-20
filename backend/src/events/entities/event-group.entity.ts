import { Selectable } from 'kysely';
import { tags } from 'typia';

export interface IEventGroup {
  eventGroupId: string & tags.Format<'uuid'>;
  name: string;
}

export type EventGroup = Selectable<IEventGroup>;
export type CreateEventGroupDto = Omit<IEventGroup, 'eventGroupId'>;
export type UpdateEventGroupDto = Partial<CreateEventGroupDto>;
