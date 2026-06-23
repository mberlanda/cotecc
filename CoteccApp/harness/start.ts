// Standalone entrypoint: serve the exported web bundle (dist-embedded) via the headless
// host so a browser / Playwright can drive the real bundle without a device.
// Usage: npm run harness:start [-- --port 8099 --dist dist-embedded]
import * as path from 'path';

import {createNodeHost} from './nodeHost';
import {Seat} from '../src/net/seat';
import {GameSession} from '../src/net/session';
import {Player} from '../src/types';
import {newGame} from '../src/utils/gameLogic';

const arg = (name: string, fallback: string): string => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const port = parseInt(arg('port', '8099'), 10);
const distRoot = path.resolve(__dirname, '..', arg('dist', 'dist-embedded'));

// A default 4-seat table (seat 1 = host, 2-4 = guests/bots) for manual + e2e play.
const players: Player[] = [1, 2, 3, 4].map(id => ({
  ID: id,
  name: `P${id}`,
  isHuman: id === 1,
  lifeCount: 3,
}));
const seats: Seat[] = players.map((p, i) => ({
  seatId: `s${p.ID}`,
  playerId: p.ID,
  displayName: p.name,
  controller: i === 0 ? 'local' : 'remote',
  connection: i === 0 ? 'connected' : 'disconnected',
  isHostSeat: i === 0,
}));

createNodeHost({
  distRoot,
  port,
  host: '0.0.0.0',
  session: new GameSession(newGame(players, 1, 3), seats),
}).then(h => {
  // eslint-disable-next-line no-console
  console.log(`cotecc harness host listening on ${h.url} (ws ${h.wsUrl})`);
});
