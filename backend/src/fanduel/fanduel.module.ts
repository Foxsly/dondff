import { Module } from '@nestjs/common';
import { FanduelService } from './fanduel.service';
import { FanduelController } from './fanduel.controller';
import { EspnModule } from '@/espn/espn.module';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [HttpModule, EspnModule],
    controllers: [FanduelController],
    providers: [FanduelService],
    exports: [FanduelService, EspnModule],
})
export class FanduelModule {}