import { Controller } from '@nestjs/common';
import { FanduelService } from './fanduel.service';
import { TypedRoute } from '@nestia/core';

@Controller('fanduel')
export class FanduelController {
  constructor(private readonly fanduelService: FanduelService) {}

  @TypedRoute.Get('test')
  getState() {
    return this.fanduelService.getFanduelProjections();
  }
}
