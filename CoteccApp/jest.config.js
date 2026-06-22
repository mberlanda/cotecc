/** @type {import('jest').Config} */
const config = {
  preset: 'jest-expo',
  collectCoverage: true,
  collectCoverageFrom: [
    // app/ is Expo Router glue (thin route re-exports + layout); the real logic
    // lives in src/ and is exercised by the screen/unit tests.
    './src/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/*.{jpg,jpeg,png,gif,svg}',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  coverageThreshold: {
    global: {
      statements: 88,
      branches: 77,
      functions: 85,
      lines: 88,
    },
    // Per-directory floors for the new networking/engine modules: a global average
    // can stay green while a new module is thinly tested, so gate them directly.
    './src/net/': {
      statements: 90,
      branches: 80,
      functions: 90,
      lines: 90,
    },
    './src/engine/': {
      statements: 90,
      branches: 80,
      functions: 90,
      lines: 90,
    },
  },
};

module.exports = config;
