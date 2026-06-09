import { Test, TestingModule } from '@nestjs/testing';
import { WorldCupService } from './world-cup.service';

describe('WorldCupService', () => {
  let service: WorldCupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorldCupService],
    }).compile();

    service = module.get<WorldCupService>(WorldCupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
