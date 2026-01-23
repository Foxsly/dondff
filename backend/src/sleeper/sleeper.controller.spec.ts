import { Test, TestingModule } from '@nestjs/testing';
import { SleeperController } from './sleeper.controller';
import { SleeperService } from './sleeper.service';
import {
  ISleeperState,
  SleeperProjectionResponse,
  SleeperStatResponse,
  SleeperStatRequest,
} from './entities/sleeper.entity';

describe('SleeperController', () => {
  let controller: SleeperController;
  let service: jest.Mocked<SleeperService>;

  const mockState: ISleeperState = {
    week: 3,
    season_type: 'regular',
    season_start_date: '2025-09-01',
    season: '2025',
    previous_season: '2024',
    leg: 3,
    league_season: '2025',
    league_create_season: '2020',
    display_week: 3,
  };

  const mockProjectionResponse: SleeperProjectionResponse = [
    {
      stats: { pts_std: 15, pts_half_ppr: 18, pts_ppr: 20, pos_adp_dd_ppr: 5 },
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
      },
      team: 'KC',
      opponent: 'LAC',
      game_id: 'game1',
      date: new Date('2025-09-15'),
      last_modified: new Date(),
      updated_at: new Date(),
    },
  ];

  const mockStatResponse: SleeperStatResponse = [
    {
      stats: { pts_std: 10, pts_half_ppr: 12, pts_ppr: 14, pos_rank_std: 2 },
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
            getNflState: jest.fn(),
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
      service.getNflState.mockResolvedValue(mockState);

      const result = await controller.getState();

      expect(service.getNflState).toHaveBeenCalled();
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
