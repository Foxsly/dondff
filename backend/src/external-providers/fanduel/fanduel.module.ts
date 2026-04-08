import { EspnModule } from '@/external-providers/espn/espn.module';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { FanduelController } from './fanduel.controller';
import { FanduelService } from './fanduel.service';

@Module({
  imports: [HttpModule, EspnModule],
  controllers: [FanduelController],
  providers: [FanduelService],
  exports: [FanduelService, EspnModule],
})
export class FanduelModule {}