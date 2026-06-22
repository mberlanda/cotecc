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
  const CONN = 'loopback-0';

  const host: HostEndpoint = {
    onClient(cb) {
      onClientCb = cb;
    },
    send(_connId, env) {
      clientMsgCb?.(env);
    },
    broadcast(env) {
      clientMsgCb?.(env);
    },
    close() {
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

  queueMicrotask(() => onClientCb?.(CONN));
  return {host, client};
};
