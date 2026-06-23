// Headless Node host harness (CI path). Runs the SAME embedded-server logic the native
// host runs — Phase 0 protocol/session + the shared asset allowlist — without a device,
// so CI and Playwright drive the real exported web bundle. Phase 1A §4.1 (RC2-QA-001).
import * as fs from 'fs';
import * as http from 'http';
import {AddressInfo} from 'net';
import {WebSocket, WebSocketServer} from 'ws';

import {resolveAsset} from './assetAllowlist';
import {
  decodeEnvelope,
  Envelope,
  ErrorCode,
  makeEnvelope,
  MoveRejectCode,
} from '../src/net/protocol';
import {GameSession} from '../src/net/session';

export interface NodeHostOptions {
  distRoot: string;
  // The authoritative session. Optional so the pure static/heartbeat contract can be
  // exercised without a game; join/move messages require it.
  session?: GameSession;
  port?: number; // 0 (default) => random high port
  host?: string; // default 127.0.0.1
  sessionId?: string;
  maxMessageBytes?: number; // ws frame cap (default 64 KiB)
  maxConnectionsPerPeer?: number; // per remote address (default 8)
}

export interface NodeHost {
  server: http.Server;
  wss: WebSocketServer;
  port: number;
  url: string; // http://<host>:<port>
  wsUrl: string; // ws://<host>:<port>/ws
  close(): Promise<void>;
}

const STATUS_TEXT: Record<number, string> = {
  400: 'bad request',
  403: 'forbidden',
  404: 'not found',
  405: 'method not allowed',
};

export const createNodeHost = (opts: NodeHostOptions): Promise<NodeHost> => {
  const host = opts.host ?? '127.0.0.1';
  const sessionId = opts.sessionId ?? 'harness';
  const maxMessageBytes = opts.maxMessageBytes ?? 64 * 1024;
  const maxPerPeer = opts.maxConnectionsPerPeer ?? 8;
  const session = opts.session;

  const server = http.createServer((req, res) => {
    const url = req.url ?? '/';
    if (url === '/healthz' || url.startsWith('/healthz?')) {
      res.writeHead(200, {'content-type': 'text/plain; charset=utf-8'});
      res.end('ok');
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, {'content-type': 'text/plain; charset=utf-8'});
      res.end(STATUS_TEXT[405]);
      return;
    }
    const asset = resolveAsset(opts.distRoot, url);
    if (asset.status !== 200 || !asset.filePath) {
      res.writeHead(asset.status, {'content-type': 'text/plain; charset=utf-8'});
      res.end(STATUS_TEXT[asset.status] ?? 'error');
      return;
    }
    res.writeHead(200, {'content-type': asset.mime ?? 'application/octet-stream'});
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(asset.filePath).pipe(res);
  });

  const wss = new WebSocketServer({noServer: true, maxPayload: maxMessageBytes});
  const perPeer = new Map<string, number>();
  let connSeq = 0;

  const send = (ws: WebSocket, env: Envelope): void => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(env));
    }
  };
  const sendError = (ws: WebSocket, code: ErrorCode, message: string): void => {
    send(ws, makeEnvelope('Error', sessionId, {code, message}));
  };

  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/ws') {
      socket.destroy();
      return;
    }
    const peer = req.socket.remoteAddress ?? 'unknown';
    const count = perPeer.get(peer) ?? 0;
    if (count >= maxPerPeer) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, ws => {
      perPeer.set(peer, count + 1);
      const connId = `c${++connSeq}`;
      // ws raises 'error' on protocol violations (e.g. an over-cap frame exceeding
      // maxPayload, which it then closes with 1009). A listener is required or Node
      // rethrows it as an unhandled error; the close is handled below.
      ws.on('error', () => undefined);
      ws.on('close', () => {
        perPeer.set(peer, Math.max(0, (perPeer.get(peer) ?? 1) - 1));
        session?.unbind(connId);
      });
      ws.on('message', data => {
        const raw =
          typeof data === 'string'
            ? data
            : Buffer.isBuffer(data)
              ? data.toString('utf8')
              : Buffer.concat(data as unknown as Uint8Array[]).toString('utf8');
        routeMessage(ws, connId, raw);
      });
    });
  });

  const routeMessage = (ws: WebSocket, connId: string, raw: string): void => {
    const decoded = decodeEnvelope(raw);
    if (!decoded.ok) {
      // BAD_FRAME has no wire ErrorCode; surface protocol mismatch explicitly and
      // close on an unparseable frame.
      if (decoded.code === 'UNSUPPORTED_PROTOCOL') {
        sendError(ws, 'UNSUPPORTED_PROTOCOL', decoded.message);
      }
      ws.close(1003, decoded.message);
      return;
    }
    const env = decoded.envelope;
    switch (env.type) {
      case 'Heartbeat': {
        send(ws, makeEnvelope('Heartbeat', sessionId, {}));
        return;
      }
      case 'JoinRequest': {
        if (!session) {
          sendError(ws, 'TABLE_FULL', 'No active table');
          return;
        }
        // A reconnect carries seatId + seatToken; a fresh join does not.
        if (env.seatId && env.seatToken) {
          const bound = session.bind(env.seatId, env.seatId, env.seatToken);
          if (!bound.ok) {
            sendError(ws, 'BAD_SEAT_TOKEN', 'Invalid seat token');
            return;
          }
          send(
            ws,
            makeEnvelope('SeatAssigned', sessionId, {
              seatId: env.seatId,
              seatToken: env.seatToken,
              view: session.viewFor(env.seatId),
            }),
          );
          return;
        }
        const info = (env.payload ?? {}) as {displayName?: string};
        const res = session.join(connId, {
          displayName: info.displayName ?? 'Guest',
        });
        if (!res.ok) {
          sendError(ws, 'TABLE_FULL', 'No seat available');
          return;
        }
        send(
          ws,
          makeEnvelope('SeatAssigned', sessionId, {
            seatId: res.seatId,
            seatToken: res.seatToken,
            view: session.viewFor(res.seatId),
          }),
        );
        return;
      }
      case 'PlayMove': {
        if (!session) {
          sendError(ws, 'GAME_ALREADY_STARTED', 'No active table');
          return;
        }
        // Seat is derived from the bound connection — never the payload (SEC-002).
        const seatId = session.seatForConn(connId);
        if (!seatId) {
          sendError(ws, 'BAD_SEAT_TOKEN', 'Connection not bound to a seat');
          return;
        }
        const payload = env.payload as Parameters<GameSession['submitMove']>[1];
        const result = session.submitMove(seatId, payload);
        if (result.ok) {
          send(
            ws,
            makeEnvelope('MoveAccepted', sessionId, {
              view: session.viewFor(seatId),
            }),
          );
          return;
        }
        if (result.code === 'STALE_STATE') {
          sendError(ws, 'STALE_STATE', result.message);
          return;
        }
        send(
          ws,
          makeEnvelope('MoveRejected', sessionId, {
            code: result.code as MoveRejectCode,
            message: result.message,
          }),
        );
        return;
      }
      default:
        // Unhandled-but-valid message types are acknowledged so a sender is never
        // left hanging on a recognised frame.
        send(ws, makeEnvelope('Ack', sessionId, {}));
    }
  };

  return new Promise<NodeHost>(resolve => {
    server.listen(opts.port ?? 0, host, () => {
      const {port} = server.address() as AddressInfo;
      resolve({
        server,
        wss,
        port,
        url: `http://${host}:${port}`,
        wsUrl: `ws://${host}:${port}/ws`,
        close: () =>
          new Promise<void>(res => {
            wss.clients.forEach(c => c.terminate());
            wss.close(() => server.close(() => res()));
          }),
      });
    });
  });
};
