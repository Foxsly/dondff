import { Test, TestingModule } from '@nestjs/testing';
import { SleeperService } from './sleeper.service';

describe('SleeperService', () => {
  let service: SleeperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SleeperService],
    }).compile();

    service = module.get<SleeperService>(SleeperService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
