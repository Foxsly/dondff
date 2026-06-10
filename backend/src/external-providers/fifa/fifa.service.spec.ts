import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import { FifaService } from './fifa.service';
import type {
  FifaRoundProjectionResponse,
  FifaRoundResponse,
  FifaPlayerResponse,
  FifaSquadResponse,
} from './entities/fifa.entity';
import roundsFixture from './__fixtures__/fifa-rounds.test.json';
import playersFixture from './__fixtures__/fifa-players.test.json';
import squadsFixture from './__fixtures__/fifa-squads.test.json';
import projectionsFixture from './__fixtures__/fifa-projections.transformed.test.json';

const mockAxiosResponse = <T>(data: T): AxiosResponse<T> => ({
  // @ts-ignore
  config: {},
  data,
  headers: {},
  status: 200,
  statusText: 'OK',
});

describe('FifaService', () => {
  let service: FifaService;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FifaService, { provide: HttpService, useValue: { get: jest.fn() } }],
    }).compile();

    service = module.get<FifaService>(FifaService);
    httpService = module.get(HttpService);
  });

  it('should return rounds', async () => {
    httpService.get.mockReturnValueOnce(of(mockAxiosResponse(roundsFixture)));

    const result: FifaRoundResponse = await service.getRounds();

    expect(result).toEqual(roundsFixture);
  });

  it('should return players', async () => {
    httpService.get.mockReturnValueOnce(of(mockAxiosResponse(playersFixture)));

    const result: FifaPlayerResponse = await service.getPlayers();

    expect(result).toEqual(playersFixture);
  });

  it('should return squads', async () => {
    httpService.get.mockReturnValueOnce(of(mockAxiosResponse(squadsFixture)));

    const result: FifaSquadResponse = await service.getSquads();

    expect(result).toEqual(squadsFixture);
  });

  it('should return merged projections for a valid round ID', async () => {
    httpService.get
      .mockReturnValueOnce(of(mockAxiosResponse(roundsFixture)))
      .mockReturnValueOnce(of(mockAxiosResponse(playersFixture)))
      .mockReturnValueOnce(of(mockAxiosResponse(squadsFixture)));

    const result: FifaRoundProjectionResponse = await service.getRoundProjections(1);

    expect(result).toEqual(projectionsFixture);
  });

  it('should return empty array for unknown round ID', async () => {
    httpService.get
      .mockReturnValueOnce(of(mockAxiosResponse(roundsFixture)))
      .mockReturnValueOnce(of(mockAxiosResponse(playersFixture)))
      .mockReturnValueOnce(of(mockAxiosResponse(squadsFixture)));

    const result: FifaRoundProjectionResponse = await service.getRoundProjections(999);

    expect(result).toEqual([]);
  });
});
