import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateEventGroupDto,
  EventGroup,
  EventGroupStatus,
  EventGroupWithDatesAndStatusDto,
  UpdateEventGroupDto,
} from './entities/event-group.entity';
import { CreateEventDto, Event, UpdateEventDto } from './entities/event.entity';
import { EventsRepository } from './events.repository';
import { SportLeague } from '@/common/types/sport-league.type';
import { EventSyncStrategyRegistry } from './strategies/event-sync-strategy.registry';

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly eventSyncRegistry: EventSyncStrategyRegistry,
  ) {}

  async createEventGroup(dto: CreateEventGroupDto): Promise<EventGroup> {
    return this.eventsRepository.createEventGroup(dto);
  }

  async findAllEventGroups(): Promise<EventGroup[]> {
    return this.eventsRepository.findAllEventGroups();
  }

  async findOneEventGroup(id: string): Promise<EventGroup> {
    const eventGroup = await this.eventsRepository.findOneEventGroup(id);
    if (!eventGroup) {
      throw new NotFoundException(`EventGroup with id ${id} not found`);
    }
    return eventGroup;
  }

  async getOrCreateEventGroup(
    name: string,
    sportLeague: SportLeague,
  ): Promise<EventGroupWithDatesAndStatusDto> {
    const existing = await this.eventsRepository.findEventGroupByName(name);
    if (existing) {
      return this.getEventGroupWithDates(existing.eventGroupId);
    }
    const created = await this.createEventGroup({ 
      name, 
      sportLeague,
    });
    return this.getEventGroupWithDates(created.eventGroupId);
  }

  async getEventGroupWithDates(eventGroupId: string): Promise<EventGroupWithDatesAndStatusDto> {
    const eventGroup = await this.findOneEventGroup(eventGroupId);
    const dateRange = await this.getDateRangeForEventGroup(eventGroupId);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let status: EventGroupStatus = 'PLAYING';

    if (dateRange.startDate && today < dateRange.startDate) {
      status = 'PENDING';
    } else if (dateRange.endDate && today > dateRange.endDate) {
      status = 'FINISHED';
    }

    return {
      ...eventGroup,
      status,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    };
  }

  async findEventGroupsBySportLeague(sportLeague: SportLeague): Promise<EventGroup[]> {
    const strategy = this.eventSyncRegistry.get(sportLeague);
    const groups = await strategy.fetchSyncData();

    for (const group of groups) {
      for (const eventData of group.events) {
        const existing = await this.eventsRepository.findEventByExternalEvent(
          eventData.externalId,
          eventData.externalSource,
        );
        if (existing) continue;

        let eventGroup = await this.eventsRepository.findEventGroupByName(group.name);
        if (!eventGroup) {
          eventGroup = await this.createEventGroup({
            name: group.name,
            sportLeague,
          });
        }

        await this.createEvent({
          eventGroupId: eventGroup.eventGroupId,
          name: eventData.name,
          startDate: eventData.startDate,
          endDate: eventData.endDate,
          externalEventId: eventData.externalId,
          externalEventSource: eventData.externalSource,
        });
      }
    }

    return this.eventsRepository.findEventGroupsBySportLeague(sportLeague);
  }

  async findEventGroupsBySportLeagueWithDates(sportLeague: SportLeague): Promise<EventGroupWithDatesAndStatusDto[]> {
    const eventGroups = await this.findEventGroupsBySportLeague(sportLeague);
    const result: EventGroupWithDatesAndStatusDto[] = [];
    for (const eg of eventGroups) {
      const withDates = await this.getEventGroupWithDates(eg.eventGroupId);
      result.push(withDates);
    }
    return result;
  }

  async updateEventGroup(id: string, dto: UpdateEventGroupDto): Promise<EventGroup> {
    const updated = await this.eventsRepository.updateEventGroup(id, dto);
    if (!updated) {
      throw new NotFoundException(`EventGroup with id ${id} not found`);
    }
    return updated;
  }

  async deleteEventGroup(id: string): Promise<void> {
    const deleted = await this.eventsRepository.deleteEventGroup(id);
    if (!deleted) {
      throw new NotFoundException(`EventGroup with id ${id} not found`);
    }
  }

  async createEvent(dto: CreateEventDto): Promise<Event> {
    return this.eventsRepository.createEvent(dto);
  }

  async findAllEvents(): Promise<Event[]> {
    return this.eventsRepository.findAllEvents();
  }

  async findOneEvent(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOneEvent(id);
    if (!event) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }
    return event;
  }

  async updateEvent(id: string, dto: UpdateEventDto): Promise<Event> {
    const updated = await this.eventsRepository.updateEvent(id, dto);
    if (!updated) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }
    return updated;
  }

  async deleteEvent(id: string): Promise<void> {
    const deleted = await this.eventsRepository.deleteEvent(id);
    if (!deleted) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }
  }

  async findEventsByEventGroup(eventGroupId: string): Promise<Event[]> {
    return this.eventsRepository.findEventsByEventGroup(eventGroupId);
  }

  async getDateRangeForEventGroup(eventGroupId: string): Promise<{ startDate: Date ; endDate: Date }> {
    const events = await this.eventsRepository.findEventsByEventGroup(eventGroupId);
    
    const startDates = events.map(e => e.startDate).filter((d): d is string | Date => d != null);
    const endDates = events.map(e => e.endDate).filter((d): d is string | Date => d != null);

    //Don't need a null check, dates are required for Events
    return {
      startDate: new Date(Math.min(...startDates.map(d => new Date(d).getTime()))),
      endDate: new Date(Math.max(...endDates.map(d => new Date(d).getTime())))
    };
  }
}
