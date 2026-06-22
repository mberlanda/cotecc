import {Envelope} from './protocol';
import {ClientConnection, HostEndpoint} from './transport';

// In-process transport: a host endpoint and a client connection wired directly to
// each other. Proves the SessionTransport seam with zero networking (offline play).
export const createLoopback = (): {
  host: HostEndpoint;
  client: ClientConnection;
} => {
  let hostMsgCb: ((env: Envelope) => void) | null = null;
  let clientMsgCb: ((env: Envelope) => void) | null = null;
  let clientCloseCb: (() => void) | null = null;
  let onClientCb: ((connId: string) => void) | null = null;
  let connected = false;
  const CONN = 'loopback-0';

  const host: HostEndpoint = {
    onClient(cb) {
      onClientCb = cb;
      // If the peer already connected before this callback was registered, notify
      // immediately so a late consumer doesn't miss the (single) connect event.
      if (connected) {
        cb(CONN);
      }
    },
    send(_connId, env) {
      clientMsgCb?.(env);
    },
    broadcast(env) {
      clientMsgCb?.(env);
    },
    close() {
      client.status = 'closed';
      clientCloseCb?.();
    },
  };

  const client: ClientConnection = {
    status: 'open',
    send(env) {
      hostMsgCb?.(env);
    },
    onMessage(cb) {
      clientMsgCb = cb;
    },
    onClose(cb) {
      clientCloseCb = cb;
    },
  };

  // host receives client frames via this hook (used by a host adapter)
  (
    host as unknown as {_onMessage: (cb: (env: Envelope) => void) => void}
  )._onMessage = cb => {
    hostMsgCb = cb;
  };

  queueMicrotask(() => {
    connected = true;
    onClientCb?.(CONN);
  });
  return {host, client};
};
