import { Test, TestingModule } from '@nestjs/testing';
import { FifaService } from './fifa.service';

describe('FifaService', () => {
  let service: FifaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FifaService],
    }).compile();

    service = module.get<FifaService>(FifaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
