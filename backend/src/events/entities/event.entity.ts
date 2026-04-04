import { Selectable } from 'kysely';
import { tags } from 'typia';

export interface IEvent {
  eventId: string & tags.Format<'uuid'>;
  eventGroupId: string & tags.Format<'uuid'>;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  externalEventId: string | null;
  externalEventSource: string | null;
}

export type Event = Selectable<IEvent>;
export type CreateEventDto = Omit<IEvent, 'eventId'>;
export type UpdateEventDto = Partial<Omit<IEvent, 'eventId'>>;
