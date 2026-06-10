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
import { EspnService } from '@/external-providers/espn/espn.service';
import { FifaService } from '@/external-providers/fifa/fifa.service';

@Injectable()
export class EventsService {
  private readonly WORLD_CUP_STAGE_NAMES: Record<string, string> = {
    R32: 'Round of 32',
    R16: 'Round of 16',
    QF: 'Quarter-finals',
    SF: 'Semi-finals',
    F: 'Final',
  };

  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly fanduelService: FanduelService,
    private readonly sleeperService: SleeperService,
    private readonly espnService: EspnService,
    private readonly fifaService: FifaService,
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
    if (sportLeague === 'GOLF') {
      await this.syncGolfEvents();
    } else if (sportLeague === 'NFL') {
      await this.syncNflEvents();
    } else if (sportLeague === 'WORLDCUP') {
      await this.syncWorldCupEvents();
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
    const currentYear = new Date().getFullYear();
    const [fanduelEvents, espnSchedule] = await Promise.all([
      this.fanduelService.getGolfEvents(),
      this.espnService.getPgaSchedule(currentYear),
    ]);

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

        const espnMatch = espnSchedule.find((espn) =>
          this.normalizeEventName(espn.name).includes(this.normalizeEventName(fanduelEvent.name)),
        );
        if (espnMatch){
          await this.createEvent({
            eventGroupId: eventGroup.eventGroupId,
            name: fanduelEvent.name,
            startDate: espnMatch?.startDate,
            endDate: espnMatch?.endDate,
            externalEventId: fanduelEvent.id,
            externalEventSource: 'FANDUEL',
          });
        }
      }
    }
  }

  private normalizeEventName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
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

  private stageDisplayName(stage: string, roundId: number): string {
    if (stage === 'GROUP') {
      return `Group Stage – Matchday ${roundId}`;
    }
    const name = this.WORLD_CUP_STAGE_NAMES[stage];
    return name ? `Knockout Stage – ${name}` : `Stage ${stage}`;
  }

  private async syncWorldCupEvents(): Promise<void> {
    const rounds = await this.fifaService.getRounds();

    for (const round of rounds) {
      for (const match of round.tournaments) {
        const externalEventId = `WC-${round.id}-${match.id}`;
        const existingEvent = await this.eventsRepository.findEventByExternalEvent(
          externalEventId,
          'FIFA',
        );
        if (existingEvent) {
          continue;
        }

        const groupName = `World Cup ${this.stageDisplayName(round.stage, round.id)}`;
        let eventGroup = await this.eventsRepository.findEventGroupByName(groupName);
        if (!eventGroup) {
          eventGroup = await this.createEventGroup({
            name: groupName,
            sportLeague: 'WORLDCUP',
          });
        }

        await this.createEvent({
          eventGroupId: eventGroup.eventGroupId,
          name: `${match.homeSquadName} vs ${match.awaySquadName}`,
          startDate: match.date,
          endDate: match.date,
          externalEventId,
          externalEventSource: 'FIFA',
        });
      }
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
