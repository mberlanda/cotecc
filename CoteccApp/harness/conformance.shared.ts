// Shared host-fidelity conformance suite (Phase 1A §4.1, RC3-QA-001).
//
// `runConformance` asserts the embedded-host contract — protocol handshake, asset
// allowlist + SPA fallback, message size caps, and reject codes — against ANY host
// addressed by (baseUrl, wsUrl). The Node harness runs it in CI (conformance.node.test.ts);
// the on-device native host runs the SAME function in the lab (a §4 lab gate), so any
// divergence between the two skins fails an identical set of assertions.
//
// It uses node:assert (not a test framework) so it is callable from Jest, tsx, or a
// device-driven script alike.
import {strict as assert} from 'assert';
import * as http from 'http';
import * as net from 'net';
import {URL} from 'url';
import {WebSocket} from 'ws';

import {makeEnvelope, PROTOCOL_VERSION} from '../src/net/protocol';

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

// Raw request bytes so a literal ".." reaches the server un-normalized.
const rawGet = (host: string, port: number, rawPath: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const sock = net.connect(port, host, () => {
      sock.write(
        `GET ${rawPath} HTTP/1.1\r\nHost: ${host}\r\nConnection: close\r\n\r\n`,
      );
    });
    let buf = '';
    sock.setEncoding('utf8');
    sock.on('data', d => (buf += d));
    sock.on('end', () => resolve(buf));
    sock.on('error', reject);
  });

interface WsOutcome {
  frames: {type: string; payload: Record<string, unknown>}[];
  closeCode?: number;
}

// Open a ws, send one (string) frame, collect inbound frames until the socket closes
// or `waitMs` elapses, then close. Returns frames + the close code if any.
const wsSend = (
  wsUrl: string,
  rawFrame: string,
  waitMs = 1500,
): Promise<WsOutcome> =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const frames: WsOutcome['frames'] = [];
    let closeCode: number | undefined;
    const done = (): void => resolve({frames, closeCode});
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {
        /* already closing */
      }
      done();
    }, waitMs);
    ws.on('open', () => ws.send(rawFrame));
    ws.on('message', data => {
      try {
        frames.push(JSON.parse(data.toString('utf8')));
      } catch {
        /* ignore non-JSON */
      }
    });
    ws.on('close', code => {
      closeCode = code;
      clearTimeout(timer);
      done();
    });
    ws.on('error', () => {
      // a server-side reject can surface as an error before close; let close/timeout settle
    });
    ws.on('unexpected-response', () => {
      clearTimeout(timer);
      reject(new Error('ws upgrade rejected'));
    });
  });

export interface ConformanceOptions {
  sessionId?: string;
  // The ws frame cap the host advertises; the size-cap check sends just over it.
  maxMessageBytes?: number;
}

// Runs every assertion against the addressed host. Resolves to the list of passed
// check names; throws (via assert) on the first failure.
export const runConformance = async (
  baseUrl: string,
  wsUrl: string,
  opts: ConformanceOptions = {},
): Promise<string[]> => {
  const sessionId = opts.sessionId ?? 'harness';
  const maxMessageBytes = opts.maxMessageBytes ?? 64 * 1024;
  const passed: string[] = [];
  const parsed = new URL(baseUrl);
  const httpHost = parsed.hostname;
  const httpPort = Number(parsed.port);

  // --- HTTP: health + static + SPA fallback + allowlist -------------------
  const health = await httpGet(`${baseUrl}/healthz`);
  assert.equal(health.status, 200, 'GET /healthz should be 200');
  assert.equal(health.body, 'ok', 'GET /healthz body should be "ok"');
  passed.push('http:healthz');

  const root = await httpGet(`${baseUrl}/`);
  assert.equal(root.status, 200, 'GET / should be 200');
  assert.ok(/text\/html/.test(root.contentType), 'GET / should be text/html');
  passed.push('http:root-html');

  const spa = await httpGet(`${baseUrl}/join`);
  assert.equal(spa.status, 200, 'GET /join should SPA-fallback to 200');
  passed.push('http:spa-fallback');

  const traversal = await rawGet(httpHost, httpPort, '/../package.json');
  assert.ok(
    /^HTTP\/1\.1 (403|404)/.test(traversal),
    'raw traversal must be rejected (403/404)',
  );
  assert.ok(
    !traversal.includes('"name"'),
    'traversal must not leak a JSON file body',
  );
  passed.push('http:traversal-rejected');

  // --- WS: protocol handshake --------------------------------------------
  const hb = await wsSend(wsUrl, JSON.stringify(makeEnvelope('Heartbeat', sessionId, {})));
  assert.ok(
    hb.frames.some(f => f.type === 'Heartbeat'),
    'Heartbeat should be echoed',
  );
  passed.push('ws:heartbeat');

  const join = await wsSend(
    wsUrl,
    JSON.stringify(makeEnvelope('JoinRequest', sessionId, {displayName: 'Conf'})),
  );
  const seatAssigned = join.frames.find(f => f.type === 'SeatAssigned');
  assert.ok(seatAssigned, 'JoinRequest should yield SeatAssigned');
  assert.equal(
    typeof seatAssigned!.payload.seatToken,
    'string',
    'SeatAssigned should carry a resume token',
  );
  passed.push('ws:join-handshake');

  // --- WS: reject codes ---------------------------------------------------
  const unbound = await wsSend(
    wsUrl,
    JSON.stringify(
      makeEnvelope('PlayMove', sessionId, {
        cardRef: {suit: 'bastoni', rank: 1},
        clientSeq: 1,
      }),
    ),
  );
  const err = unbound.frames.find(f => f.type === 'Error');
  assert.ok(err, 'unbound PlayMove should be rejected with an Error');
  assert.equal(
    err!.payload.code,
    'BAD_SEAT_TOKEN',
    'unbound PlayMove reject code should be BAD_SEAT_TOKEN',
  );
  passed.push('ws:reject-unbound-move');

  // --- WS: unsupported protocol version ----------------------------------
  const badProto = await wsSend(
    wsUrl,
    JSON.stringify({
      protocolVersion: PROTOCOL_VERSION + 999,
      sessionId,
      type: 'Heartbeat',
      sentAt: new Date().toISOString(),
      payload: {},
    }),
  );
  const protoErr = badProto.frames.find(
    f => f.type === 'Error' && f.payload.code === 'UNSUPPORTED_PROTOCOL',
  );
  assert.ok(
    protoErr || badProto.closeCode !== undefined,
    'unsupported protocol must error or close the socket',
  );
  passed.push('ws:unsupported-protocol');

  // --- WS: message size cap ----------------------------------------------
  const oversize = JSON.stringify({
    protocolVersion: PROTOCOL_VERSION,
    sessionId,
    type: 'Heartbeat',
    sentAt: new Date().toISOString(),
    payload: {blob: 'x'.repeat(maxMessageBytes + 1024)},
  });
  const capped = await wsSend(wsUrl, oversize);
  assert.ok(
    capped.closeCode !== undefined,
    'an over-cap message must close the socket (size cap enforced)',
  );
  passed.push('ws:size-cap');

  return passed;
};
