import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { FifaService } from './fifa.service';
import { FifaController } from './fifa.controller';

@Module({
  imports: [HttpModule],
  controllers: [FifaController],
  providers: [FifaService],
  exports: [FifaService],
})
export class FifaModule {}
