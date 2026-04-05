import { Controller } from '@nestjs/common';
import { EspnService } from './espn.service';

@Controller('espn')
export class EspnController {
  constructor(private readonly espnService: EspnService) {}
}
