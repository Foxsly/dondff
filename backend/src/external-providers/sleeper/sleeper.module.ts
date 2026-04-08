import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SleeperController } from './sleeper.controller';
import { SleeperService } from './sleeper.service';

@Module({
  imports: [HttpModule],
  controllers: [SleeperController],
  providers: [SleeperService],
  exports: [SleeperService],
})
export class SleeperModule {}
