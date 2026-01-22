import { Module } from '@nestjs/common';
import { FanduelService } from './fanduel.service';
import { FanduelController } from './fanduel.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [HttpModule],
    controllers: [FanduelController],
    providers: [FanduelService],
    exports: [FanduelService],
})
export class FanduelModule {}