import { Test, TestingModule } from '@nestjs/testing';
import { EspnController } from './espn.controller';
import { EspnService } from './espn.service';

describe('EspnController', () => {
  let controller: EspnController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EspnController],
      providers: [EspnService],
    }).compile();

    controller = module.get<EspnController>(EspnController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
