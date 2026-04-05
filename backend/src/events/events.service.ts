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
import { SportLeague } from '@/leagues/entities/league.entity';
import { FanduelService } from '@/external-providers/fanduel/fanduel.service';
import { SleeperService } from '@/external-providers/sleeper/sleeper.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly fanduelService: FanduelService,
    private readonly sleeperService: SleeperService,
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
    let status: EventGroupStatus = 'PLAYING';

    if (dateRange.startDate && now < dateRange.startDate) {
      status = 'PENDING';
    } else if (dateRange.endDate && now > dateRange.endDate) {
      status = 'FINISHED';
    }

    return {
      ...eventGroup,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      status,
    };
  }

  async findEventGroupsBySportLeague(sportLeague: SportLeague): Promise<EventGroup[]> {
    if (sportLeague === 'GOLF') {
      await this.syncGolfEvents();
    } else if (sportLeague === 'NFL') {
      await this.syncNflEvents();
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

  private async syncGolfEvents(): Promise<void> {
    const fanduelEvents = await this.fanduelService.getGolfEvents();

    for (const fanduelEvent of fanduelEvents) {
      const existingEvent = await this.eventsRepository.findEventByExternalEvent(
        fanduelEvent.id,
        'FANDUEL',
      );

      if (!existingEvent) {
        const eventGroup = await this.createEventGroup({
          name: fanduelEvent.name,
          sportLeague: 'GOLF',
        });
        await this.createEvent({
          eventGroupId: eventGroup.eventGroupId,
          name: fanduelEvent.name,
          //TODO make these dates right
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          externalEventId: fanduelEvent.id,
          externalEventSource: 'FANDUEL',
        });
      }
    }
  }

  private async syncNflEvents(): Promise<void> {
    const nflState = await this.sleeperService.getNflState();
    const weekNumber = nflState.week;
    const seasonYear = Number(nflState.season);
    const externalEventId = `${seasonYear}-${weekNumber}`;

    const existingEvent = await this.eventsRepository.findEventByExternalEvent(
      externalEventId,
      'SLEEPER',
    );

    if (!existingEvent) {
      const eventGroup = await this.createEventGroup({
        name: `NFL Week ${weekNumber}`,
        sportLeague: 'NFL',
      });
      await this.createEvent({
        eventGroupId: eventGroup.eventGroupId,
        name: `NFL Week ${weekNumber}`,
        //TODO make these dates right
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        externalEventId,
        externalEventSource: 'SLEEPER',
      });
    }
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

  async getDateRangeForEventGroup(eventGroupId: string): Promise<{ startDate: Date | null; endDate: Date | null }> {
    const events = await this.eventsRepository.findEventsByEventGroup(eventGroupId);
    
    if (events.length === 0) {
      return { startDate: null, endDate: null };
    }

    const startDates = events.map(e => e.startDate).filter(Boolean);
    const endDates = events.map(e => e.endDate).filter(Boolean);

    return {
      startDate: startDates.length > 0 
        ? new Date(Math.min(...startDates.map(d => new Date(d).getTime()))) 
        : null,
      endDate: endDates.length > 0 
        ? new Date(Math.max(...endDates.map(d => new Date(d).getTime()))) 
        : null,
    };
  }
}
