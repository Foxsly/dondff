import { Selectable } from 'kysely';
import { tags } from 'typia';
import { SportLeague } from '@/common/types/sport-league.type';

export interface IEventGroup {
  eventGroupId: string & tags.Format<'uuid'>;
  name: string;
  sportLeague: SportLeague;
}

export type EventGroup = Selectable<IEventGroup>;
export type CreateEventGroupDto = Omit<IEventGroup, 'eventGroupId'>;
export type UpdateEventGroupDto = Partial<CreateEventGroupDto>;

export type EventGroupStatus = 'PENDING' | 'PLAYING' | 'FINISHED';

export interface EventGroupWithDatesAndStatusDto extends IEventGroup {
  startDate?: Date;
  endDate?: Date;
  status: EventGroupStatus;
}
