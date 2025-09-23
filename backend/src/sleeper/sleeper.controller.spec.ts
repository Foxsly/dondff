import { Test, TestingModule } from '@nestjs/testing';
import { SleeperController } from './sleeper.controller';
import { SleeperService } from './sleeper.service';

describe('SleeperController', () => {
  let controller: SleeperController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SleeperController],
      providers: [SleeperService],
    }).compile();

    controller = module.get<SleeperController>(SleeperController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
