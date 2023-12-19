module.exports = {
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
  preset: 'react-native',
};
