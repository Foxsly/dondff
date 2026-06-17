import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { EspnService } from './espn.service';

describe('EspnService', () => {
  let service: EspnService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EspnService, { provide: HttpService, useValue: { get: jest.fn() } }],
    }).compile();

    service = module.get<EspnService>(EspnService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
