import 'jest';

const actualAppearance = jest.requireActual(
  'react-native/Libraries/Utilities/Appearance',
);

module.exports = {
  ...actualAppearance,
  useColorScheme: jest.fn(),
};
