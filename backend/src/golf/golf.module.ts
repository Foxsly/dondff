import { Module } from '@nestjs/common';
import { GolfService } from './golf.service';

@Module({
  providers: [GolfService],
  exports: [GolfService],
})
export class GolfModule {}
