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
};

module.exports = config;
