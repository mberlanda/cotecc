import {createLoopback} from './loopback';
import {Envelope, makeEnvelope} from './protocol';

it('delivers host->client and client->host frames and fires onClient', async () => {
  const {host, client} = createLoopback();
  const clientGot: string[] = [];
  const hostGot: string[] = [];
  let connId = '';
  host.onClient(id => (connId = id));
  client.onMessage(env => clientGot.push(env.type));
  (
    host as unknown as {_onMessage: (cb: (e: Envelope) => void) => void}
  )._onMessage(env => hostGot.push(env.type));
  await Promise.resolve(); // flush queueMicrotask(onClient)
  expect(connId).toBe('loopback-0');

  host.broadcast(makeEnvelope('Heartbeat', 's', {}));
  client.send(
    makeEnvelope('PlayMove', 's', {cardRef: {suit: 'ori', rank: 7}, clientSeq: 1}),
  );
  expect(clientGot).toContain('Heartbeat');
  expect(hostGot).toContain('PlayMove');
});

it('fires onClose when the host closes', () => {
  const {host, client} = createLoopback();
  let closed = false;
  client.onClose(() => (closed = true));
  host.close();
  expect(closed).toBe(true);
});

it('flips client.status to closed when the host closes', () => {
  const {host, client} = createLoopback();
  expect(client.status).toBe('open');
  host.close();
  expect(client.status).toBe('closed');
});

it('notifies a late onClient registration of the already-connected peer', async () => {
  const {host} = createLoopback();
  await Promise.resolve(); // peer connects via queueMicrotask
  let connId = '';
  host.onClient(id => (connId = id)); // registered AFTER connect
  expect(connId).toBe('loopback-0');
});
