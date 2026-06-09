import { Controller } from '@nestjs/common';
import { WorldCupService } from './world-cup.service';

@Controller('world-cup')
export class WorldCupController {
  constructor(private readonly worldCupService: WorldCupService) {}
}
