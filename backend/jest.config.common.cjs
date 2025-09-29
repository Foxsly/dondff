const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

const common = {
  testEnvironment: 'node',
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
};

module.exports = { common };
