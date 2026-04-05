import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { EventsService } from './events.service';
import { EventGroupsController, EventsController } from './events.controller';
import { DatabaseEventsRepository, EventsRepository } from './events.repository';
import { FanduelModule } from '@/fanduel/fanduel.module';
import { SleeperModule } from '@/sleeper/sleeper.module';

@Module({
  controllers: [EventGroupsController, EventsController],
  providers: [
    EventsService,
    {
      provide: EventsRepository,
      useClass: DatabaseEventsRepository,
    },
  ],
  imports: [DatabaseModule, FanduelModule, SleeperModule],
  exports: [EventsService],
})
export class EventsModule {}
