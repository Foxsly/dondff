const { common } = require('./jest.config.common.cjs');

module.exports = {
  ...common,
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/src/.*\\.e2e\\.spec\\.ts$'],
  setupFilesAfterEnv: ['<rootDir>/src/infrastructure/test/jest.setup.ts'],
};
