import { Module } from '@nestjs/common';
import { SleeperService } from './sleeper.service';
import { SleeperController } from './sleeper.controller';
import { HttpModule } from '@nestjs/axios'

@Module({
  imports: [HttpModule],
  controllers: [SleeperController],
  providers: [SleeperService],
})
export class SleeperModule {}
