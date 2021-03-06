/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.ts"
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  verbose: true,
  testPathIgnorePatterns: [
    "/node_modules/"
  ],
  roots: [
    "<rootDir>/src"
  ],
  globalSetup: './test/jest.setup.js',
  globalTeardown: './test/jest.teardown.js',
};