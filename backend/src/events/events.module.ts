import { EspnModule } from '@/external-providers/espn/espn.module';
import { FanduelModule } from '@/external-providers/fanduel/fanduel.module';
import { FifaModule } from '@/external-providers/fifa/fifa.module';
import { SleeperModule } from '@/external-providers/sleeper/sleeper.module';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { Module } from '@nestjs/common';
import { EventGroupsController, EventsController } from './events.controller';
import { DatabaseEventsRepository, EventsRepository } from './events.repository';
import { EventsService } from './events.service';

@Module({
  controllers: [EventGroupsController, EventsController],
  providers: [
    EventsService,
    {
      provide: EventsRepository,
      useClass: DatabaseEventsRepository,
    },
  ],
  imports: [DatabaseModule, FanduelModule, SleeperModule, EspnModule, FifaModule],
  exports: [EventsService],
})
export class EventsModule {}
