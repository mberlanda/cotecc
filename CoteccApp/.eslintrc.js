// Intentionally using the legacy .eslintrc format (not flat eslint.config.js).
// Expo SDK 56 pins eslint 8.57, where flat config is opt-in only; eslint-config-expo
// ships and validates the legacy `extends: 'expo'` config against that version.
// Revisit (migrate to eslint.config.js) when Expo's SDK moves the toolchain to eslint 9.
module.exports = {
  root: true,
  extends: 'expo',
  plugins: ['import'],
  // rules from https://manurana.medium.com/organizing-imports-in-react-and-react-native-faf982a3a3b5
  rules: {
    // this is for sorting WITHIN an import
    'sort-imports': ['error', {ignoreCase: true, ignoreDeclarationSort: true}],
    // this is for sorting imports
    'import/order': [
      'error',
      {
        groups: [
          ['external', 'builtin'],
          'internal',
          ['sibling', 'parent'],
          'index',
        ],
        pathGroups: [
          {
            pattern: '@(react|react-native)',
            group: 'external',
            position: 'before',
          },
          {
            pattern: '@src/**',
            group: 'internal',
          },
        ],
        pathGroupsExcludedImportTypes: ['internal', 'react'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
  },
  overrides: [
    {
      // Client UI must consume SeatView (src/net/seatView), never engine GameState.
      // (Foundations §2.3 / RC2-ARCH-001). Pattern form matches the imported NAME
      // across every path spelling (../types, ../../types, @src/types).
      files: ['src/screens/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
      excludedFiles: ['**/*.test.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/types', '@src/types'],
                importNames: ['GameState'],
                message:
                  'Client UI must consume SeatView (src/net/seatView), never engine GameState. (RC2-ARCH-001)',
              },
              {
                group: [
                  '**/utils/gameLogic',
                  '**/utils/roundLogic',
                  '**/engine/*',
                ],
                message:
                  'Client UI must not import the engine directly; go through a SeatView/session. (RC2-ARCH-001)',
              },
            ],
          },
        ],
      },
    },
  ],
  ignorePatterns: [
    '**/node_modules/**',
    '**/coverage/**',
    '**/dist/**',
    '/android/**',
    '/ios/**',
    '/.expo/**',
    '/vendor/**',
  ],
};
