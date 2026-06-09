import { Test, TestingModule } from '@nestjs/testing';
import { FifaController } from './fifa.controller';
import { FifaService } from './fifa.service';

describe('FifaController', () => {
  let controller: FifaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FifaController],
      providers: [FifaService],
    }).compile();

    controller = module.get<FifaController>(FifaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
