import { Module } from '@nestjs/common';
import { NflService } from './nfl.service';

@Module({
  providers: [NflService],
  exports: [NflService],
})
export class NflModule {}
