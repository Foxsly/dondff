import { DatabaseModule } from '@/infrastructure/database/database.module';
import { NflModule } from '@/nfl/nfl.module';
import { GolfModule } from '@/golf/golf.module';
import { WorldCupModule } from '@/world-cup/world-cup.module';
import { Module } from '@nestjs/common';
import { EventGroupsController, EventsController } from './events.controller';
import { DatabaseEventsRepository, EventsRepository } from './events.repository';
import { EventsService } from './events.service';
import { EventSyncStrategyRegistry } from './strategies/event-sync-strategy.registry';

@Module({
  controllers: [EventGroupsController, EventsController],
  providers: [
    EventsService,
    EventSyncStrategyRegistry,
    {
      provide: EventsRepository,
      useClass: DatabaseEventsRepository,
    },
  ],
  imports: [DatabaseModule, NflModule, GolfModule, WorldCupModule],
  exports: [EventsService],
})
export class EventsModule {}
