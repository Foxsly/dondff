import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateEventGroupDto,
  EventGroup,
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
    dates?: { startDate?: string | null; endDate?: string | null },
  ): Promise<EventGroup> {
    const existing = await this.eventsRepository.findEventGroupByName(name);
    if (existing) {
      // Backfill dates if the existing group is missing them
      if (dates && (dates.startDate || dates.endDate) && !existing.startDate && !existing.endDate) {
        const updated = await this.eventsRepository.updateEventGroup(existing.eventGroupId, {
          startDate: dates.startDate ?? null,
          endDate: dates.endDate ?? null,
        });
        return updated ?? existing;
      }
      return existing;
    }
    return this.createEventGroup({ 
      name, 
      sportLeague,
      //TODO make these dates correct (or remove them like I originally intended and save them on the `EVENT` row)
      startDate: dates?.startDate ?? null,
      endDate: dates?.endDate ?? null,
    });
  }

  async findEventGroupsBySportLeague(sportLeague: SportLeague): Promise<EventGroup[]> {
    if (sportLeague === 'GOLF') {
      await this.syncGolfEvents();
    } else if (sportLeague === 'NFL') {
      await this.syncNflEvents();
    }
    return this.eventsRepository.findEventGroupsBySportLeague(sportLeague);
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
          startDate: null,
          endDate: null,
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
        startDate: null,
        endDate: null,
      });
      await this.createEvent({
        eventGroupId: eventGroup.eventGroupId,
        name: `NFL Week ${weekNumber}`,
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
}
