import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EspnService } from './espn.service';
import { EspnController } from './espn.controller';

@Module({
  imports: [HttpModule],
  controllers: [EspnController],
  providers: [EspnService],
  exports: [EspnService],
})
export class EspnModule {}
