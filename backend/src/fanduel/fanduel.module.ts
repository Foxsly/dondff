import { Module } from '@nestjs/common';
import { FanduelService } from './fanduel.service';
import { FanduelController } from './fanduel.controller';
import { EspnService } from './espn.service';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [HttpModule],
    controllers: [FanduelController],
    providers: [FanduelService, EspnService],
    exports: [FanduelService, EspnService],
})
export class FanduelModule {}