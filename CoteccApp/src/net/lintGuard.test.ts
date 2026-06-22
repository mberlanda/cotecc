import {execFileSync} from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Verifies the client-only-SeatView guard actually flags a GameState import in a
// client folder. Runs eslint as a subprocess (the eslint Node API can't be imported
// inside the jest-expo runtime) over the fixture, treated as if it lived at
// src/screens/_guardcheck.tsx so the override's `files` glob matches.
it('flags a client-component GameState import (RC2-ARCH-001 guard is live)', () => {
  const appRoot = path.join(__dirname, '..', '..');
  const code = fs.readFileSync(
    path.join(__dirname, '__lintfixtures__', 'badClientImport.txt'),
    'utf8',
  );
  let output = '';
  let exitCode = 0;
  try {
    execFileSync(
      'npx',
      ['eslint', '--stdin', '--stdin-filename', 'src/screens/_guardcheck.tsx'],
      {cwd: appRoot, input: code, encoding: 'utf8'},
    );
  } catch (err) {
    const e = err as {status?: number; stdout?: string};
    exitCode = e.status ?? 1;
    output = e.stdout ?? '';
  }
  expect(exitCode).not.toBe(0); // eslint must fail on the bad import
  expect(output).toContain('no-restricted-imports');
}, 30000);
