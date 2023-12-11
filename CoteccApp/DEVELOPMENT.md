# CoteccApp

Development notes

```
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── CardComponent.tsx
│   │   └── PlayerHand.tsx
│   ├── screens/           # Screens of the app
│   │   └── GameScreen.tsx
│   ├── utils/             # Utility functions for game logic
│   │   ├── gameLogic.ts
│   │   └── constants.ts   # Game-related constants
│   ├── App.tsx            # Main component
│   └── types.ts           # TypeScript types and interfaces
├── __tests__/             # Tests for your application
├── index.js               # Entry point of the app
├── package.json
└── README.md
```


## Troubleshooting

### Error: Invariant Violation: "main" has not been registered.

```
ERROR  Invariant Violation: "main" has not been registered. This can happen if:
* Metro (the local dev server) is run from the wrong folder. Check if Metro is running, stop it and restart it in the current project.
* A module failed to load due to an error and `AppRegistry.registerComponent` wasn't called., js engine: hermes
```

According to https://stackoverflow.com/q/62649381, restoring a clean local state can be enough
to fix this issue.

Run `npm run clean` to remove .expo, coverage, and node_modules data.

This is not resolving the problem in iOS and we should update after resolving some naming
inconsistencies: https://stackoverflow.com/a/73018527.
