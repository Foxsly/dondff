import { Test, TestingModule } from '@nestjs/testing';
import { LeaguesService } from './leagues.service';
import { NotFoundException } from '@nestjs/common';
import { League } from './entities/league.entity';
import { ITeam } from '@/teams/entities/team.entity';
import { LeaguesRepository } from '@/leagues/leagues.repository';

describe('LeaguesService', () => {
  let service: LeaguesService;
  let repo: jest.Mocked<LeaguesRepository>;

  const mockLeague: League = {
    leagueId: 'uuid-1',
    name: 'Test League',
  };
  const mockRepo: jest.Mocked<LeaguesRepository> = {
    createLeague:       jest.fn(),
    findAllLeagues:      jest.fn(),
    findOneLeague:      jest.fn(),
    updateLeague:       jest.fn(),
    deleteLeague:       jest.fn(),
    findLeagueUsers:   jest.fn(),
    addLeagueUser:     jest.fn(),
    removeLeagueUser:  jest.fn(),
    updateLeagueUser:  jest.fn(),
    findLeagueTeams:   jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaguesService,
        { provide: LeaguesRepository, useValue: mockRepo }, // <-- match token
      ],
    }).compile();

    service = module.get(LeaguesService);
    repo = module.get(LeaguesRepository) as jest.Mocked<LeaguesRepository>;
  });

  it('should create a league', async () => {
    repo.createLeague.mockResolvedValue(mockLeague);
    const result = await service.create({ name: 'Test League' });
    expect(result).toEqual(mockLeague);
    expect(repo.createLeague).toHaveBeenCalledWith({ name: 'Test League' });
  });

  it('should find all leagues', async () => {
    repo.findAllLeagues.mockResolvedValue([mockLeague]);
    const result = await service.findAll();
    expect(result).toEqual([mockLeague]);
  });

  it('should find a league by id', async () => {
    repo.findOneLeague.mockResolvedValue(mockLeague);
    const result = await service.findOne('uuid-1');
    expect(result).toEqual(mockLeague);
    expect(repo.findOneLeague).toHaveBeenCalledWith('uuid-1');
  });

  it('should throw NotFoundException if league not found', async () => {
    repo.findOneLeague.mockResolvedValue(null);
    await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should update a league', async () => {
    const updatedLeague = { ...mockLeague, name: 'Updated' };
    repo.updateLeague.mockResolvedValue(updatedLeague);
    const result = await service.update('uuid-1', { name: 'Updated' });
    expect(result).toEqual(updatedLeague);
    expect(repo.updateLeague).toHaveBeenCalledWith('uuid-1', { name: 'Updated' });
  });

  it('should throw NotFoundException if update fails', async () => {
    repo.updateLeague.mockResolvedValue(null);
    await expect(service.update('uuid-1', { name: 'Updated' })).rejects.toThrow(NotFoundException);
  });

  it('should remove a league', async () => {
    repo.deleteLeague.mockResolvedValue(true);
    await expect(service.remove('uuid-1')).resolves.toBeUndefined();
    expect(repo.deleteLeague).toHaveBeenCalledWith('uuid-1');
  });

  it('should throw NotFoundException if remove fails', async () => {
    repo.deleteLeague.mockResolvedValue(false);
    await expect(service.remove('uuid-1')).rejects.toThrow(NotFoundException);
  });

  it('should find league users', async () => {
    const users = [{ userId: 'u1', name: 'Alice' }];
    repo.findLeagueUsers.mockResolvedValue(users as any);
    const result = await service.findLeagueUsers('uuid-1');
    expect(result).toEqual(users);
    expect(repo.findLeagueUsers).toHaveBeenCalledWith('uuid-1');
  });

  it('should add a league user', async () => {
    const userDto = { userId: 'u1', role: 'member' };
    repo.addLeagueUser.mockResolvedValue(userDto as any);
    const result = await service.addLeagueUser('uuid-1', userDto);
    expect(result).toEqual(userDto);
    expect(repo.addLeagueUser).toHaveBeenCalledWith('uuid-1', userDto);
  });

  it('should remove a league user', async () => {
    repo.removeLeagueUser.mockResolvedValue(true);
    const result = await service.removeLeagueUser('uuid-1', 'u1');
    expect(result).toBe(true);
    expect(repo.removeLeagueUser).toHaveBeenCalledWith('uuid-1', 'u1');
  });

  it('should update a league user', async () => {
    const updateDto = { role: 'admin' };
    repo.updateLeagueUser.mockResolvedValue(updateDto as any);
    const result = await service.updateLeagueUser('uuid-1', 'u1', updateDto);
    expect(result).toEqual(updateDto);
    expect(repo.updateLeagueUser).toHaveBeenCalledWith('uuid-1', 'u1', updateDto);
  });

  it('should get league teams', async () => {
    const teams: ITeam[] = [{ teamId: 't1', leagueId: 'uuid-1', userId: 'u1', seasonYear: 2025, week: 1, players: [] }];
    repo.findLeagueTeams.mockResolvedValue(teams);
    const result = await service.getLeagueTeams('uuid-1');
    expect(result).toEqual(teams);
    expect(repo.findLeagueTeams).toHaveBeenCalledWith('uuid-1');
  });
});
