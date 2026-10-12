import { Test, TestingModule } from '@nestjs/testing';
import {
  ISleeperState,
  SleeperNflStatResponse,
  SleeperStatRequest,
} from './entities/sleeper.entity';
import { SleeperController } from './sleeper.controller';
import { SleeperService } from './sleeper.service';

describe('SleeperController', () => {
  let controller: SleeperController;
  let service: jest.Mocked<SleeperService>;

  const mockState: ISleeperState = {
    week: 3,
    season_type: 'regular',
    season: '2025',
    leg: 3,
    league_season: '2025',
    display_week: 3,
  };

  const mockProjectionResponse: SleeperNflStatResponse = [
    {
      stats: { pts_std: 15, pts_half_ppr: 18, pts_ppr: 20},
      week: 3,
      season: 2025,
      season_type: 'regular',
      sport: 'nfl',
      player_id: 'qb123',
      player: {
        fantasy_positions: ['QB'],
        first_name: 'Patrick',
        last_name: 'Mahomes',
        position: 'QB',
        injury_status: null,
        metadata: { genius_id: 'proj-qb123' },
      },
      team: 'KC',
      opponent: 'LAC',
      game_id: 'game1',
      date: new Date('2025-09-15'),
      last_modified: new Date(),
      updated_at: new Date(),
    },
  ];

  const mockStatResponse: SleeperNflStatResponse = [
    {
      stats: { pts_std: 10, pts_half_ppr: 12, pts_ppr: 14},
      week: 4,
      season: 2025,
      season_type: 'regular',
      sport: 'nfl',
      player_id: 'rb456',
      player: {
        fantasy_positions: ['RB'],
        first_name: 'Christian',
        last_name: 'McCaffrey',
        position: 'RB',
        injury_status: null,
        metadata: { genius_id: 'stats-rb456' },
      },
      team: 'SF',
      opponent: 'SEA',
      game_id: 'game2',
      date: new Date('2025-09-22'),
      last_modified: new Date(),
      updated_at: new Date(),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SleeperController],
      providers: [
        {
          provide: SleeperService,
          useValue: {
            getStateForSport: jest.fn(),
            getPlayerProjections: jest.fn(),
            getPlayerStatistics: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SleeperController>(SleeperController);
    service = module.get(SleeperService);
  });

  describe('getState', () => {
    it('should return NFL state', async () => {
      service.getStateForSport.mockResolvedValue(mockState);

      const result = await controller.getState();

      expect(service.getStateForSport).toHaveBeenCalled();
      expect(result).toEqual(mockState);
    });
  });

  describe('getProjections', () => {
    it('should call service.getPlayerProjections with correct args and return projections', async () => {
      const query: SleeperStatRequest = { position: 'QB' };
      service.getPlayerProjections.mockResolvedValue(mockProjectionResponse);

      const result = await controller.getProjections(2025, 3, query);

      expect(service.getPlayerProjections).toHaveBeenCalledWith('QB', 2025, 3);
      expect(result).toEqual(mockProjectionResponse);
    });
  });

  describe('getStats', () => {
    it('should call service.getPlayerStatistics with correct args and return stats', async () => {
      const query: SleeperStatRequest = { position: 'RB' };
      service.getPlayerStatistics.mockResolvedValue(mockStatResponse);

      const result = await controller.getStats(2025, 4, query);

      expect(service.getPlayerStatistics).toHaveBeenCalledWith('RB', 2025, 4);
      expect(result).toEqual(mockStatResponse);
    });
  });
});
