import {Envelope} from './protocol';

export interface HostEndpoint {
  onClient(cb: (connId: string) => void): void;
  send(connId: string, env: Envelope): void;
  broadcast(env: Envelope): void;
  close(): void;
}

export interface ClientConnection {
  send(env: Envelope): void;
  onMessage(cb: (env: Envelope) => void): void;
  onClose(cb: () => void): void;
  status: 'open' | 'closed';
}

// Backpressure contract (WS-008): a concrete HostEndpoint MUST bound its per-peer queue,
// coalesce obsolete state updates (prefer the latest snapshot over queued deltas), and
// drop peers exceeding the queue/bufferedAmount threshold. The interface stays
// transport-agnostic; the WebSocket and SSE+POST adapters enforce it (Phase 1A/1B).
export interface BackpressureLimits {
  maxQueuedPerPeer: number;
  maxBufferedBytes: number;
}
