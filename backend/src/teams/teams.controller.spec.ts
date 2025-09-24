import { Test, TestingModule } from '@nestjs/testing';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { ITeam, Team, CreateTeamDto, UpdateTeamDto } from './entities/team.entity';
import { ITeamPlayer } from './entities/team-player.entity';
import { NotFoundException } from '@nestjs/common';

describe('TeamsController', () => {
  let controller: TeamsController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const mockPlayers: ITeamPlayer[] = [
    { teamId: 'uuid-team-1', position: 'QB', playerId: 1, playerName: 'Patrick Mahomes' },
    { teamId: 'uuid-team-1', position: 'RB', playerId: 2, playerName: 'Derrick Henry' },
  ];

  const mockTeam: ITeam = {
    teamId: 'uuid-team-1',
    leagueId: 'uuid-league-1',
    userId: 'uuid-user-1',
    seasonYear: 2025,
    week: 2,
    players: mockPlayers,
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [{ provide: TeamsService, useValue: service }],
    }).compile();

    controller = module.get<TeamsController>(TeamsController);
  });
  describe('test', () => {
    it('exists', async () => {
      expect(controller).toBeDefined();
    })
  })
  describe('create', () => {
    it('calls service.create and returns the created team', async () => {
      const dto: CreateTeamDto = {
        leagueId: mockTeam.leagueId,
        userId: mockTeam.userId,
        seasonYear: mockTeam.seasonYear,
        week: mockTeam.week,
      };
      service.create.mockResolvedValue(mockTeam as Team);

      const result = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockTeam);
    });
  });

  describe('findAll', () => {
    it('returns all teams', async () => {
      service.findAll.mockResolvedValue([mockTeam]);

      const result = await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockTeam]);
    });
  });

  describe('findOne', () => {
    it('returns a team by ID', async () => {
      service.findOne.mockResolvedValue(mockTeam);

      const result = await controller.findOne(mockTeam.teamId);
      expect(service.findOne).toHaveBeenCalledWith(mockTeam.teamId);
      expect(result).toEqual(mockTeam);
    });

    it('throws NotFoundException if team not found', async () => {
      service.findOne.mockImplementation(() => {
        throw new NotFoundException();
      });

      await expect(controller.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates a team and returns it', async () => {
      const dto: UpdateTeamDto = { week: 3 };
      service.update.mockResolvedValue({ ...mockTeam, ...dto });

      const result = await controller.update(mockTeam.teamId, dto);
      expect(service.update).toHaveBeenCalledWith(mockTeam.teamId, dto);
      expect(result.week).toBe(3);
    });

    it('throws NotFoundException if team not found', async () => {
      const dto: UpdateTeamDto = { week: 3 };
      service.update.mockImplementation(() => {
        throw new NotFoundException();
      });

      await expect(controller.update('non-existent-id', dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('calls service.remove', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(mockTeam.teamId);
      expect(service.remove).toHaveBeenCalledWith(mockTeam.teamId);
    });

    it('throws NotFoundException if team not found', async () => {
      service.remove.mockRejectedValue(new NotFoundException());

      await expect(controller.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
