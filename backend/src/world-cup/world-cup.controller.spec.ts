import { Test, TestingModule } from '@nestjs/testing';
import { WorldCupController } from './world-cup.controller';
import { WorldCupService } from './world-cup.service';

describe('WorldCupController', () => {
  let controller: WorldCupController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorldCupController],
      providers: [WorldCupService],
    }).compile();

    controller = module.get<WorldCupController>(WorldCupController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
