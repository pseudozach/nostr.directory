import { test, expect } from 'vitest';
import { WebSocketServer } from 'ws';
import { DittoRelay } from '../../services/directory/src/relay';
import { fixture } from '../identity/fixtures';

test('persistent WebSocket multiplexes native NIP50 query and matching ACK/readback', async () => {
  const server = new WebSocketServer({port: 0, host: '127.0.0.1'});
  await new Promise<void>(r => server.once('listening', r));
  const address = server.address() as {port: number}; const event = fixture();
  const messages: unknown[][] = []; let connections = 0;
  server.on('connection', socket => {
    connections++;
    socket.on('message', raw => {
      const m = JSON.parse(raw.toString()); messages.push(m);
      if (m[0] === 'EVENT') { socket.send(JSON.stringify(['OK', 'wrong', true, ''])); socket.send(JSON.stringify(['OK', event.id, true, 'stored'])); }
      if (m[0] === 'REQ') { socket.send(JSON.stringify(['EVENT', m[1], event])); socket.send(JSON.stringify(['EOSE', m[1]])); }
    });
  });
  const relay = new DittoRelay(`ws://127.0.0.1:${address.port}`);
  try {
    expect(await relay.publish(event, new AbortController().signal)).toEqual({id:event.id,accepted:true});
    expect(await relay.current(event.pubkey, 10011, new AbortController().signal)).toEqual(event);
    await relay.query({kinds:[0], search:'Ali', limit:20});
    expect(messages.some(m => m[0] === 'REQ' && (m[2] as any).search === 'Ali')).toBe(true);
    expect(connections).toBe(1);
  } finally { relay.close(); await new Promise<void>(r => server.close(() => r())); }
});
