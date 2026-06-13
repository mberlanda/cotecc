/** @type {import('jest').Config} */
const config = {
  preset: 'jest-expo',
  collectCoverage: true,
  collectCoverageFrom: [
    './src/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/*.{jpg,jpeg,png,gif,svg}',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  coverageThreshold: {
    global: {
      statements: 86,
      branches: 74,
      functions: 81,
      lines: 85,
    },
  },
};

module.exports = config;
