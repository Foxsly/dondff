import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from './teams.service';
import { NotFoundException } from '@nestjs/common';
import { ITeam, Team, CreateTeamDto, UpdateTeamDto } from './entities/team.entity';
import { ITeamsRepository, TEAMS_REPOSITORY } from '@/teams/teams.repository';

describe('TeamsService', () => {
  let service: TeamsService;
  let repo: jest.Mocked<ITeamsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: TEAMS_REPOSITORY,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
    repo = module.get(TEAMS_REPOSITORY) as jest.Mocked<ITeamsRepository>;
  });

  const mockTeam: Team = {
    teamId: 'team-1',
    leagueId: 'league-1',
    userId: 'user-1',
    seasonYear: 2025,
    week: 1,
  };

  const mockITeam: ITeam = {
    teamId: 'team-1',
    leagueId: 'league-1',
    userId: 'user-1',
    seasonYear: 2025,
    week: 1,
    players: [],
  };

  describe('create', () => {
    it('should call repo.create and return the team', async () => {
      const dto: CreateTeamDto = {
        leagueId: 'league-1',
        userId: 'user-1',
        seasonYear: 2025,
        week: 1,
      };
      repo.create.mockResolvedValue(mockTeam);

      const result = await service.create(dto);
      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockTeam);
    });
  });

  describe('findAll', () => {
    it('should return all teams', async () => {
      repo.findAll.mockResolvedValue([mockITeam]);
      const result = await service.findAll();
      expect(repo.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockITeam]);
    });
  });

  describe('findOne', () => {
    it('should return a team if found', async () => {
      repo.findOne.mockResolvedValue(mockITeam);
      const result = await service.findOne('team-1');
      expect(repo.findOne).toHaveBeenCalledWith('team-1');
      expect(result).toEqual(mockITeam);
    });

    it('should throw NotFoundException if team not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('team-2')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and return the team', async () => {
      const updateDto: UpdateTeamDto = { week: 2 };
      const updatedTeam = { ...mockTeam, week: 2 };
      repo.update.mockResolvedValue(updatedTeam);

      const result = await service.update('team-1', updateDto);
      expect(repo.update).toHaveBeenCalledWith('team-1', updateDto);
      expect(result).toEqual(updatedTeam);
    });

    it('should throw NotFoundException if team not found', async () => {
      repo.update.mockResolvedValue(null);
      const updateDto: UpdateTeamDto = { week: 2 };
      await expect(service.update('team-2', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove the team', async () => {
      repo.remove.mockResolvedValue(true);
      await service.remove('team-1');
      expect(repo.remove).toHaveBeenCalledWith('team-1');
    });

    it('should throw NotFoundException if team not found', async () => {
      repo.remove.mockResolvedValue(false);
      await expect(service.remove('team-2')).rejects.toThrow(NotFoundException);
    });
  });
});
