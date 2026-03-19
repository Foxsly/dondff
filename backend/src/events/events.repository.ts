import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { DB_PROVIDER } from '@/infrastructure/database/database.module';
import { DB } from '@/infrastructure/database/types';
import {
  CreateEventGroupDto,
  EventGroup,
  UpdateEventGroupDto,
} from './entities/event-group.entity';
import { CreateEventDto, Event, UpdateEventDto } from './entities/event.entity';

export abstract class EventsRepository {
  abstract createEventGroup(dto: CreateEventGroupDto): Promise<EventGroup>;
  abstract findAllEventGroups(): Promise<EventGroup[]>;
  abstract findOneEventGroup(id: string): Promise<EventGroup | null>;
  abstract updateEventGroup(id: string, dto: UpdateEventGroupDto): Promise<EventGroup | null>;
  abstract deleteEventGroup(id: string): Promise<boolean>;

  abstract createEvent(dto: CreateEventDto): Promise<Event>;
  abstract findAllEvents(): Promise<Event[]>;
  abstract findOneEvent(id: string): Promise<Event | null>;
  abstract updateEvent(id: string, dto: UpdateEventDto): Promise<Event | null>;
  abstract deleteEvent(id: string): Promise<boolean>;

  abstract findEventsByEventGroup(eventGroupId: string): Promise<Event[]>;
}

@Injectable()
export class DatabaseEventsRepository extends EventsRepository {
  constructor(@Inject(DB_PROVIDER) private readonly db: Kysely<DB>) {
    super();
  }

  async createEventGroup(dto: CreateEventGroupDto): Promise<EventGroup> {
    const row = await this.db
      .insertInto('eventGroup')
      .values({
        eventGroupId: crypto.randomUUID(),
        name: dto.name,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return row as EventGroup;
  }

  async findAllEventGroups(): Promise<EventGroup[]> {
    const rows = await this.db.selectFrom('eventGroup').selectAll().execute();
    return rows as EventGroup[];
  }

  async findOneEventGroup(id: string): Promise<EventGroup | null> {
    const row = await this.db
      .selectFrom('eventGroup')
      .selectAll()
      .where('eventGroupId', '=', id)
      .executeTakeFirst();
    return row ? (row as EventGroup) : null;
  }

  async updateEventGroup(
    id: string,
    dto: UpdateEventGroupDto,
  ): Promise<EventGroup | null> {
    const result = await this.db
      .updateTable('eventGroup')
      .set(dto)
      .where('eventGroupId', '=', id)
      .returningAll()
      .executeTakeFirst();
    return result ? (result as EventGroup) : null;
  }

  async deleteEventGroup(id: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('eventGroup')
      .where('eventGroupId', '=', id)
      .executeTakeFirst();
    return (result?.numDeletedRows ?? 0n) > 0n;
  }

  async createEvent(dto: CreateEventDto): Promise<Event> {
    const row = await this.db
      .insertInto('event')
      .values({
        eventId: crypto.randomUUID(),
        eventGroupId: dto.eventGroupId,
        name: dto.name,
        startDate: dto.startDate,
        endDate: dto.endDate,
        externalEventId: dto.externalEventId,
        externalEventSource: dto.externalEventSource,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return row as Event;
  }

  async findAllEvents(): Promise<Event[]> {
    const rows = await this.db.selectFrom('event').selectAll().execute();
    return rows as Event[];
  }

  async findOneEvent(id: string): Promise<Event | null> {
    const row = await this.db
      .selectFrom('event')
      .selectAll()
      .where('eventId', '=', id)
      .executeTakeFirst();
    return row ? (row as Event) : null;
  }

  async updateEvent(id: string, dto: UpdateEventDto): Promise<Event | null> {
    const result = await this.db
      .updateTable('event')
      .set(dto)
      .where('eventId', '=', id)
      .returningAll()
      .executeTakeFirst();
    return result ? (result as Event) : null;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('event')
      .where('eventId', '=', id)
      .executeTakeFirst();
    return (result?.numDeletedRows ?? 0n) > 0n;
  }

  async findEventsByEventGroup(eventGroupId: string): Promise<Event[]> {
    const rows = await this.db
      .selectFrom('event')
      .selectAll()
      .where('eventGroupId', '=', eventGroupId)
      .execute();
    return rows as Event[];
  }
}
