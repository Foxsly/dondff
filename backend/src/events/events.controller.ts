import { TypedBody, TypedParam, TypedRoute } from '@nestia/core';
import { Body, Controller } from '@nestjs/common';
import {
  CreateEventGroupDto,
  EventGroup,
  UpdateEventGroupDto,
} from './entities/event-group.entity';
import { CreateEventDto, Event, UpdateEventDto } from './entities/event.entity';
import { EventsService } from './events.service';

@Controller('event-groups')
export class EventGroupsController {
  constructor(private readonly eventsService: EventsService) {}

  @TypedRoute.Post()
  create(@Body() dto: CreateEventGroupDto): Promise<EventGroup> {
    return this.eventsService.createEventGroup(dto);
  }

  @TypedRoute.Post('get-or-create')
  getOrCreate(
    @Body() dto: CreateEventGroupDto,
  ): Promise<EventGroup> {
    return this.eventsService.getOrCreateEventGroup(dto.name, {
      startDate: dto.startDate,
      endDate: dto.endDate,
    });
  }

  @TypedRoute.Get()
  findAll(): Promise<EventGroup[]> {
    return this.eventsService.findAllEventGroups();
  }

  @TypedRoute.Get(':id')
  findOne(@TypedParam('id') id: string): Promise<EventGroup> {
    return this.eventsService.findOneEventGroup(id);
  }

  @TypedRoute.Put(':id')
  update(
    @TypedParam('id') id: string,
    @Body() dto: UpdateEventGroupDto,
  ): Promise<EventGroup> {
    return this.eventsService.updateEventGroup(id, dto);
  }

  @TypedRoute.Delete(':id')
  remove(@TypedParam('id') id: string): Promise<void> {
    return this.eventsService.deleteEventGroup(id);
  }
}

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @TypedRoute.Post()
  create(@Body() dto: CreateEventDto): Promise<Event> {
    return this.eventsService.createEvent(dto);
  }

  @TypedRoute.Get()
  findAll(): Promise<Event[]> {
    return this.eventsService.findAllEvents();
  }

  @TypedRoute.Get(':id')
  findOne(@TypedParam('id') id: string): Promise<Event> {
    return this.eventsService.findOneEvent(id);
  }

  @TypedRoute.Put(':id')
  update(@TypedParam('id') id: string, @Body() dto: UpdateEventDto): Promise<Event> {
    return this.eventsService.updateEvent(id, dto);
  }

  @TypedRoute.Delete(':id')
  remove(@TypedParam('id') id: string): Promise<void> {
    return this.eventsService.deleteEvent(id);
  }
}
