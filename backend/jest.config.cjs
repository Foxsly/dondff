const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        isolatedModules: false,
      },
    ],
  },
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || { '@/*': ['*'] }, {
    prefix: '<rootDir>/src/',
  }),
  setupFilesAfterEnv: ['<rootDir>/src/infrastructure/test/jest.setup.ts'],
};
