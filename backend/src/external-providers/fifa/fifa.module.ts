import { Module } from '@nestjs/common';
import { FifaService } from './fifa.service';
import { FifaController } from './fifa.controller';

@Module({
  controllers: [FifaController],
  providers: [FifaService],
})
export class FifaModule {}
