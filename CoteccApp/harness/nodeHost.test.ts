/**
 * @jest-environment node
 */
import * as fs from 'fs';
import * as http from 'http';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import {WebSocket} from 'ws';

import {resolveAsset} from './assetAllowlist';
import {createNodeHost, NodeHost} from './nodeHost';
import {makeEnvelope} from '../src/net/protocol';
import {Seat} from '../src/net/seat';
import {GameSession} from '../src/net/session';
import {Player} from '../src/types';
import {newGame} from '../src/utils/gameLogic';

// --- fixtures -------------------------------------------------------------
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

let distRoot: string;
const HASHED_JS = '_expo/static/js/web/entry-abc123.js';

beforeAll(() => {
  distRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cotecc-dist-'));
  fs.writeFileSync(
    path.join(distRoot, 'index.html'),
    '<!doctype html><html><body>app shell</body></html>',
  );
  fs.writeFileSync(path.join(distRoot, 'game.html'), '<html>game</html>');
  fs.mkdirSync(path.join(distRoot, '_expo/static/js/web'), {recursive: true});
  fs.writeFileSync(
    path.join(distRoot, HASHED_JS),
    'console.log("bundle");',
  );
});

afterAll(() => {
  fs.rmSync(distRoot, {recursive: true, force: true});
});

// --- http helper (node http, not the jest-expo-mocked global fetch) -------
interface HttpRes {
  status: number;
  contentType: string;
  body: string;
}
const httpGet = (url: string, method = 'GET'): Promise<HttpRes> =>
  new Promise((resolve, reject) => {
    const req = http.request(url, {method}, res => {
      const chunks: Uint8Array[] = [];
      res.on('data', c => chunks.push(c as Uint8Array));
      res.on('end', () =>
        resolve({
          status: res.statusCode ?? 0,
          contentType: res.headers['content-type'] ?? '',
          body: Buffer.concat(chunks).toString('utf8'),
        }),
      );
    });
    req.on('error', reject);
    req.end();
  });

// Send a RAW request line so the path bytes reach the server un-normalized (node's
// URL client would collapse %2e%2e before sending — that can't exercise the guard).
const rawRequest = (port: number, rawPath: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const sock = net.connect(port, '127.0.0.1', () => {
      sock.write(`GET ${rawPath} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`);
    });
    let buf = '';
    sock.setEncoding('utf8');
    sock.on('data', d => (buf += d));
    sock.on('end', () => resolve(buf));
    sock.on('error', reject);
  });

// --- ws helper ------------------------------------------------------------
const wsRoundTrip = (
  wsUrl: string,
  toSend: object,
  // returns the FIRST inbound frame
): Promise<{type: string; payload: Record<string, unknown>}> =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error('ws timeout'));
    }, 4000);
    ws.on('open', () => ws.send(JSON.stringify(toSend)));
    ws.on('message', data => {
      clearTimeout(timer);
      const frame = JSON.parse(data.toString('utf8'));
      ws.close();
      resolve(frame);
    });
    ws.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });
  });

describe('resolveAsset (shared static policy)', () => {
  it('maps / to index.html as text/html', () => {
    const r = resolveAsset(distRoot, '/');
    expect(r.status).toBe(200);
    expect(r.mime).toContain('text/html');
  });

  it('serves a hashed .js bundle as application/javascript', () => {
    const r = resolveAsset(distRoot, '/' + HASHED_JS);
    expect(r.status).toBe(200);
    expect(r.mime).toContain('application/javascript');
  });

  it('falls back to index.html for an SPA route (/join)', () => {
    const r = resolveAsset(distRoot, '/join');
    expect(r.status).toBe(200);
    expect(r.filePath).toContain('index.html');
  });

  it('rejects path traversal with 403', () => {
    expect(resolveAsset(distRoot, '/../package.json').status).toBe(403);
    expect(resolveAsset(distRoot, '/%2e%2e/package.json').status).toBe(403);
  });

  it('returns 404 for a missing asset (not a fallback)', () => {
    expect(resolveAsset(distRoot, '/_expo/missing.js').status).toBe(404);
  });
});

describe('nodeHost HTTP + WS contract', () => {
  let host: NodeHost;

  beforeAll(async () => {
    host = await createNodeHost({
      distRoot,
      session: new GameSession(newGame(players, 1, 3), seats),
    });
  });
  afterAll(async () => {
    await host.close();
  });

  it('GET /healthz -> 200 ok', async () => {
    const res = await httpGet(`${host.url}/healthz`);
    expect(res.status).toBe(200);
    expect(res.body).toBe('ok');
  });

  it('GET / -> 200 text/html', async () => {
    const res = await httpGet(`${host.url}/`);
    expect(res.status).toBe(200);
    expect(res.contentType).toContain('text/html');
  });

  it('GET hashed .js -> application/javascript', async () => {
    const res = await httpGet(`${host.url}/${HASHED_JS}`);
    expect(res.status).toBe(200);
    expect(res.contentType).toContain('application/javascript');
  });

  it('GET /join -> 200 SPA fallback to index.html', async () => {
    const res = await httpGet(`${host.url}/join`);
    expect(res.status).toBe(200);
    expect(res.body).toContain('app shell');
  });

  it('rejects a raw un-normalized path traversal with 403', async () => {
    // Raw bytes so ".." is NOT collapsed by a URL client before reaching the server.
    const raw = await rawRequest(host.port, '/../package.json');
    expect(raw).toMatch(/^HTTP\/1\.1 403/);
    expect(raw).not.toContain('"name": "CoteccApp"'); // package.json never leaked
  });

  it('POST to a static path -> 405', async () => {
    const res = await httpGet(`${host.url}/`, 'POST');
    expect(res.status).toBe(405);
  });

  it('WS Heartbeat is echoed', async () => {
    const frame = await wsRoundTrip(
      host.wsUrl,
      makeEnvelope('Heartbeat', 'harness', {}),
    );
    expect(frame.type).toBe('Heartbeat');
  });

  it('WS JoinRequest -> SeatAssigned with a seat + resume token', async () => {
    const frame = await wsRoundTrip(
      host.wsUrl,
      makeEnvelope('JoinRequest', 'harness', {displayName: 'Ann'}),
    );
    expect(frame.type).toBe('SeatAssigned');
    expect(frame.payload.seatId).toBe('s2');
    expect(typeof frame.payload.seatToken).toBe('string');
  });

  it('WS PlayMove from an unbound connection is rejected (seat derived from conn)', async () => {
    const frame = await wsRoundTrip(
      host.wsUrl,
      makeEnvelope('PlayMove', 'harness', {
        cardRef: {suit: 'bastoni', rank: 1},
        clientSeq: 1,
      }),
    );
    expect(frame.type).toBe('Error');
    expect(frame.payload.code).toBe('BAD_SEAT_TOKEN');
  });
});
