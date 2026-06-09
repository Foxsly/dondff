import { Controller } from '@nestjs/common';
import { FifaService } from './fifa.service';

@Controller('fifa')
export class FifaController {
  constructor(private readonly fifaService: FifaService) {}
}
