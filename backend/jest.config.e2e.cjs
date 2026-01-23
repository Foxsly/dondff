const { common } = require('./jest.config.common.cjs');

module.exports = {
  ...common,
  testMatch: ['<rootDir>/src/**/*.e2e.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/infrastructure/test/jest.setup.e2e.ts'],
};
