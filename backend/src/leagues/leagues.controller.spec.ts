import { Test, TestingModule } from '@nestjs/testing';
import { LeaguesController } from './leagues.controller';
import { LeaguesService } from './leagues.service';
import { NotFoundException } from '@nestjs/common';
import { CreateLeagueDto, UpdateLeagueDto, League } from './entities/league.entity';
import { ILeagueUser, AddLeagueUserDto, UpdateLeagueUserDto } from './entities/league-user.entity';

describe('LeaguesController', () => {
  let controller: LeaguesController;
  let service: jest.Mocked<LeaguesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeaguesController],
      providers: [
        {
          provide: LeaguesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findLeagueUsers: jest.fn(),
            addLeagueUser: jest.fn(),
            removeLeagueUser: jest.fn(),
            updateLeagueUser: jest.fn(),
            getLeagueTeams: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LeaguesController>(LeaguesController);
    service = module.get(LeaguesService) as jest.Mocked<LeaguesService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with DTO', () => {
      const dto: CreateLeagueDto = { name: 'Test League' };
      controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return an array of leagues', async () => {
      const leagues: League[] = [
        { leagueId: 'uuid1', name: 'L1' },
        { leagueId: 'uuid2', name: 'L2' },
      ];
      service.findAll.mockResolvedValue(leagues);
      expect(await controller.findAll()).toBe(leagues);
    });
  });

  describe('findOne', () => {
    it('should return a league if found', async () => {
      const league: League = { leagueId: 'uuid1', name: 'L1' };
      service.findOne.mockResolvedValue(league);
      await expect(controller.findOne('uuid1')).resolves.toEqual(league);
    });

    it('should throw NotFoundException if league not found', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());
      await expect(controller.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should call service.update with id and DTO', () => {
      const dto: UpdateLeagueDto = { name: 'Updated League' };
      controller.update('uuid1', dto);
      expect(service.update).toHaveBeenCalledWith('uuid1', dto);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id', () => {
      controller.remove('uuid1');
      expect(service.remove).toHaveBeenCalledWith('uuid1');
    });
  });

  describe('findLeagueUsers', () => {
    it('should return league users', async () => {
      const users: ILeagueUser[] = [{ leagueId: 'uuid1', userId: 'user1', role: 'member' }];
      service.findLeagueUsers.mockResolvedValue(users);
      expect(await controller.findLeagueUsers('uuid1')).toBe(users);
    });
  });

  describe('addLeagueUser', () => {
    it('should call service.addLeagueUser with leagueId and DTO', () => {
      const dto: AddLeagueUserDto = { userId: 'user1', role: 'member' };
      controller.addLeagueUser('uuid1', dto);
      expect(service.addLeagueUser).toHaveBeenCalledWith('uuid1', dto);
    });
  });

  describe('removeLeagueUser', () => {
    it('should call service.removeLeagueUser with leagueId and userId', async () => {
      service.removeLeagueUser.mockResolvedValue(true);
      await expect(controller.removeLeagueUser('uuid1', 'user1')).resolves.toBe(true);
    });
  });

  describe('updateLeagueUser', () => {
    it('should call service.updateLeagueUser with ids and DTO', async () => {
      const dto: UpdateLeagueUserDto = { role: 'admin' };
      const user: ILeagueUser = {
        leagueId: 'uuid1',
        userId: 'user1',
        role: 'admin',
      };
      service.updateLeagueUser.mockResolvedValue(user);
      await expect(controller.updateLeagueUser('uuid1', 'user1', dto)).resolves.toEqual(user);
    });
  });

  describe('getLeagueTeams', () => {
    it('should return league teams', () => {
      const teams = [{ teamId: 'team1', leagueId: 'uuid1', name: 'T1' }] as any;
      service.getLeagueTeams.mockReturnValue(teams);
      expect(controller.getLeagueTeams('uuid1')).toBe(teams);
    });
  });
});
