/**
 * @jest-environment node
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {runConformance} from './conformance.shared';
import {createNodeHost, NodeHost} from './nodeHost';
import {Seat} from '../src/net/seat';
import {GameSession} from '../src/net/session';
import {Player} from '../src/types';
import {newGame} from '../src/utils/gameLogic';

// TODO(phase1a-native): conformance.native.e2e.ts runs this SAME runConformance suite
// against the on-device host (a lab gate per Task 11 Step 2 / 1B §4, not a CI path), so
// divergence between the Node harness and the native host fails an identical assertion set.

const players: Player[] = [
  {ID: 1, name: 'A', isHuman: true, lifeCount: 3},
  {ID: 2, name: 'B', isHuman: true, lifeCount: 3},
];
const seats: Seat[] = [
  {
    seatId: 's1',
    playerId: 1,
    displayName: 'Host',
    controller: 'local',
    connection: 'connected',
    isHostSeat: true,
  },
  {
    seatId: 's2',
    playerId: 2,
    displayName: 'Guest',
    controller: 'remote',
    connection: 'disconnected',
    isHostSeat: false,
  },
];

describe('host conformance (Node harness skin)', () => {
  let distRoot: string;
  let host: NodeHost;

  beforeAll(async () => {
    distRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cotecc-conf-'));
    fs.writeFileSync(
      path.join(distRoot, 'index.html'),
      '<!doctype html><html><body>app shell</body></html>',
    );
    host = await createNodeHost({
      distRoot,
      sessionId: 'harness',
      maxMessageBytes: 64 * 1024,
      session: new GameSession(newGame(players, 1, 3), seats),
    });
  });

  afterAll(async () => {
    await host.close();
    fs.rmSync(distRoot, {recursive: true, force: true});
  });

  it('passes every shared conformance assertion', async () => {
    const passed = await runConformance(host.url, host.wsUrl, {
      sessionId: 'harness',
      maxMessageBytes: 64 * 1024,
    });
    // All named checks must have run (none short-circuited).
    expect(passed).toEqual([
      'http:healthz',
      'http:root-html',
      'http:spa-fallback',
      'http:traversal-rejected',
      'ws:heartbeat',
      'ws:join-handshake',
      'ws:reject-unbound-move',
      'ws:unsupported-protocol',
      'ws:size-cap',
    ]);
  });
});
