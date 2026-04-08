import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { EspnController } from './espn.controller';
import { EspnService } from './espn.service';

@Module({
  imports: [HttpModule],
  controllers: [EspnController],
  providers: [EspnService],
  exports: [EspnService],
})
export class EspnModule {}
