import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { generatePrivateKey } from 'nostr-tools';
import { expect, test } from 'vitest';
import { createServer } from '../../services/directory/src/server';
import { DirectoryStore } from '../../services/directory/src/store';
import { AdmissionPolicy } from '../../services/directory/src/policy';
import { DiscoveryWorker } from '../../services/directory/src/discovery';
import { postSignedEvent } from '../../src/pages/api/directory/publish';
import { fixture } from '../identity/fixtures';

// Exercise the actual HTTP handler without opening a host listener.
async function request(server: ReturnType<typeof createServer>, path: string, body?: unknown): Promise<Response> {
  const req = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]) as IncomingMessage;
  req.method = body === undefined ? 'GET' : 'POST';
  req.url = path;
  req.headers = { 'content-type': 'application/json' };
  Object.defineProperty(req, 'socket', { value: { remoteAddress: '127.0.0.1' } });
  return new Promise((resolve) => {
    let status = 200;
    let headers = {};
    const res = {
      writeHead(code: number, values: Record<string, string>) { status = code; headers = values; },
      end(value: string) { resolve(new Response(value, { status, headers })); },
    } as unknown as ServerResponse;
    server.emit('request', req, res);
  });
}

test('actual backend ACK confirms publication through the actual Next proxy', async () => {
  const event = fixture();
  const store = new DirectoryStore(':memory:');
  const server = createServer({ store, relay: {
    async publish() { return { id: event.id, accepted: true }; },
    async current() { return event; },
    async query() { return []; },
    close() {},
  } });
  try {
    const transport: typeof fetch = async (url, init) => request(server, new URL(String(url)).pathname, JSON.parse(String(init?.body)));
    const result = await postSignedEvent('http://127.0.0.1', event, transport);
    expect(result).toEqual({ status: 200, body: { accepted: true, eventId: event.id } });
    expect(store.current(event.pubkey, 10011)).toEqual(event);
  } finally { store.close(); }
});

test.each(['publish', 'readback'])('HTTP, detail observation and discovery cannot steal an author slot during pending %s', async (phase) => {
  const key = generatePrivateKey();
  const first = fixture({}, key);
  const second = fixture();
  const store = new DirectoryStore(':memory:');
  const policy = new AdmissionPolicy(store, { maxAuthors: 1 });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let entered!: () => void;
  const started = new Promise<void>((resolve) => { entered = resolve; });
  let publications = 0;
  let observed = first;
  const relay = {
    async publish(event: typeof first) {
      publications++;
      if (phase === 'publish' && event.id === first.id) { entered(); await gate; }
      return { id: event.id, accepted: true };
    },
    async current(pubkey: string, kind: number) {
      if (kind !== 10011) return null;
      if (phase === 'readback' && pubkey === first.pubkey && !store.has(pubkey)) { entered(); await gate; }
      return pubkey === first.pubkey ? observed : second;
    },
    async query() { return [second]; },
    close() {},
  };
  const server = createServer({ store, relay, policy });
  const discovery = new DiscoveryWorker(store, relay, [{ name: 'peer', relay }], { policy, delayMs: 0 });
  const pending = request(server, '/api/events', first);
  await started;
  try {
    expect((await request(server, '/api/events', second)).status).toBe(429);
    expect((await request(server, '/api/directory/' + second.pubkey)).status).toBe(429);
    await discovery.tick();
    expect((store.state('coverage') as { upstreamUnavailable: boolean }).upstreamUnavailable).toBe(true);
    expect(store.state('peer:peer')).toBeNull();
    expect(publications).toBe(1);
    expect(store.roster(true)).toEqual([]);
  } finally { release(); await pending; await discovery.stop(); }
  try {
    expect(store.roster(true)).toEqual([first.pubkey]);
    observed = fixture({ created_at: first.created_at + 1, tags: [] }, key);
    expect((await request(server, '/api/events', observed)).status).toBe(200);
    expect(store.current(first.pubkey, 10011)).toEqual(observed);
    expect(store.claims(first.pubkey)).toEqual([]);
    expect((await request(server, '/api/events', second)).status).toBe(429);
  } finally { store.close(); }
});
