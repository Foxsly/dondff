import { Controller } from '@nestjs/common';
import { FanduelService } from './fanduel.service';
import { TypedRoute, TypedParam, TypedQuery } from '@nestia/core';
import { FanduelSport } from './fanduel.projections.config';

type ProjectionsQuery = {
  slateId?: string;
  eventId?: string;
};

@Controller('fanduel')
export class FanduelController {
  constructor(private readonly fanduelService: FanduelService) {}

  @TypedRoute.Get('GOLF/events')
  getGolfEvents() {
    return this.fanduelService.getGolfEvents();
  }

  @TypedRoute.Get('GOLF/slates')
  getGolfSlates() {
    return this.fanduelService.getGolfSlates();
  }

  // New: sport-selected projections
  @TypedRoute.Get(':sport/projections')
  getProjectionsBySport(
      @TypedParam('sport') sport: FanduelSport,
      @TypedQuery() query: ProjectionsQuery,
  ) {
    return this.fanduelService.getProjectionsBySport(sport, query);
  }


}
