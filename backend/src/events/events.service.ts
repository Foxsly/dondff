import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateEventGroupDto,
  EventGroup,
  UpdateEventGroupDto,
} from './entities/event-group.entity';
import { CreateEventDto, Event, UpdateEventDto } from './entities/event.entity';
import { EventsRepository } from './events.repository';

@Injectable()
export class EventsService {
  constructor(private readonly eventsRepository: EventsRepository) {}

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
