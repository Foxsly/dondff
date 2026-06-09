import { Test, TestingModule } from '@nestjs/testing';
import { FifaController } from './fifa.controller';
import { FifaService } from './fifa.service';
import type {
  FifaRoundResponse,
  FifaPlayerResponse,
  FifaSquadResponse,
  FifaRoundProjectionResponse,
} from './entities/fifa.entity';
import roundsFixture from './__fixtures__/fifa-rounds.test.json';
import playersFixture from './__fixtures__/fifa-players.test.json';
import squadsFixture from './__fixtures__/fifa-squads.test.json';
import projectionsFixture from './__fixtures__/fifa-projections.transformed.test.json';

describe('FifaController', () => {
  let controller: FifaController;
  let service: jest.Mocked<FifaService>;

  const mockRoundsResponse: FifaRoundResponse = roundsFixture;
  const mockPlayersResponse: FifaPlayerResponse = playersFixture;
  const mockSquadsResponse: FifaSquadResponse = squadsFixture;
  const mockProjectionsResponse: FifaRoundProjectionResponse = projectionsFixture;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FifaController],
      providers: [
        {
          provide: FifaService,
          useValue: {
            getRounds: jest.fn(),
            getPlayers: jest.fn(),
            getSquads: jest.fn(),
            getRoundProjections: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FifaController>(FifaController);
    service = module.get(FifaService);
  });

  describe('getRounds', () => {
    it('should return rounds from service', async () => {
      service.getRounds.mockResolvedValue(mockRoundsResponse);

      const result = await controller.getRounds();

      expect(service.getRounds).toHaveBeenCalled();
      expect(result).toEqual(mockRoundsResponse);
    });
  });

  describe('getPlayers', () => {
    it('should return players from service', async () => {
      service.getPlayers.mockResolvedValue(mockPlayersResponse);

      const result = await controller.getPlayers();

      expect(service.getPlayers).toHaveBeenCalled();
      expect(result).toEqual(mockPlayersResponse);
    });
  });

  describe('getSquads', () => {
    it('should return squads from service', async () => {
      service.getSquads.mockResolvedValue(mockSquadsResponse);

      const result = await controller.getSquads();

      expect(service.getSquads).toHaveBeenCalled();
      expect(result).toEqual(mockSquadsResponse);
    });
  });

  describe('getRoundProjections', () => {
    it('should call service.getRoundProjections with correct args', async () => {
      service.getRoundProjections.mockResolvedValue(mockProjectionsResponse);

      const result = await controller.getRoundProjections(1);

      expect(service.getRoundProjections).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockProjectionsResponse);
    });
  });
});
