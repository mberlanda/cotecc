/** @type {import('jest').Config} */

const config = {
  collectCoverage: true,
  collectCoverageFrom: [
    './src/**/*.{js,jsx,ts,tsx}', // Include all JavaScript and TypeScript files
    '!**/*.d.ts', // Exclude TypeScript declaration files
    '!**/node_modules/**', // Exclude node_modules
    '!**/vendor/**', // Exclude vendor
    '!**/*.{jpg,jpeg,png,gif,svg}', // Exclude image files
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  // https://jestjs.io/docs/configuration#modulenamemapper-objectstring-string--arraystring
  // moduleNameMapper: {},
  preset: 'react-native',
  // https://github.com/react-navigation/react-navigation/issues/8669#issuecomment-926020453
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|react-clone-referenced-element|@react-native-community|rollbar-react-native|@fortawesome|@react-native|@react-navigation)',
  ],
};

module.exports = config;
