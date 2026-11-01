import { afterAll, beforeAll, expect, test } from 'vitest';
import { generatePrivateKey } from 'nostr-tools';
import { fixture } from '../identity/fixtures';
import type { DirectoryEvent } from '../../src/identity/events';

// No remote endpoint override: local fixture signatures must NEVER be published publicly.
const url = 'ws://127.0.0.1:18139';
const WebSocket = require('ws');
let socket: any;
let seq = 0;
const pending = new Map<string, { messages: any[]; done: (value: any[]) => void }>();

beforeAll(async () => {
  socket = new WebSocket(url, { maxPayload: 65536, handshakeTimeout: 2000 });
  await new Promise<void>((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  socket.on('message', (data: Buffer) => {
    const msg = JSON.parse(data.toString());
    const entry = pending.get(msg[1]);
    if (!entry) return;
    entry.messages.push(msg);
    if (msg[0] === 'EOSE' || msg[0] === 'OK' || msg[0] === 'CLOSED') entry.done(entry.messages);
  });
});
afterAll(() => socket?.terminate());

function exchange(message: any[]): Promise<any[]> {
  const id = message[0] === 'EVENT' ? message[1].id : message[1];
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('relay response timeout')); }, 3000);
    pending.set(id, { messages: [], done(messages) {
      clearTimeout(timer); pending.delete(id);
      if (message[0] === 'REQ') socket.send(JSON.stringify(['CLOSE', id]));
      resolve(messages);
    } });
    socket.send(JSON.stringify(message));
  });
}
async function publish(event: DirectoryEvent) { return (await exchange(['EVENT', event]))[0]; }
async function query(filter: Record<string, unknown>): Promise<DirectoryEvent[]> {
  const messages = await exchange(['REQ', `q${seq++}`, { ...filter, limit: 20 }]);
  expect(messages[messages.length - 1][0]).toBe('EOSE');
  return messages.filter((m) => m[0] === 'EVENT').map((m) => m[2]);
}

test('pinned runtime reports version 2.5.1', async () => {
  const res = await fetch('http://127.0.0.1:18139/', { headers: { Accept: 'application/nostr+json' } });
  expect((await res.json()).version).toBe('2.5.1');
});

test('durably accepts valid signed lists and rejects tag tampering', async () => {
  const valid = fixture();
  expect((await publish(valid)).slice(0, 3)).toEqual(['OK', valid.id, true]);
  expect((await query({ authors: [valid.pubkey], kinds: [10011] })).map((e) => e.id)).toEqual([valid.id]);
  const bad = { ...fixture(), tags: [['i', 'github:changed', 'gist']] };
  expect((await publish(bad))[2]).toBe(false);
});

test('equal-time replacement converges to lowest event ID, not arrival order', async () => {
  for (const reverse of [false, true]) {
    const key = generatePrivateKey();
    const pair = [fixture({ content: 'one' }, key), fixture({ content: 'two' }, key)].sort((a, b) => a.id.localeCompare(b.id));
    const order = reverse ? [...pair].reverse() : pair;
    for (const event of order) await publish(event!);
    expect((await query({ authors: [pair[0]!.pubkey], kinds: [10011] })).map((e) => e.id)).toEqual([pair[0]!.id]);
  }
});

test('newer empty lists remove exact i-tag membership without resurrecting history', async () => {
  const key = generatePrivateKey();
  const old = fixture({}, key);
  const empty = fixture({ created_at: old.created_at + 1, tags: [] }, key);
  await publish(old); await publish(empty); await publish(old);
  expect((await query({ authors: [old.pubkey], kinds: [10011] })).map((e) => e.id)).toEqual([empty.id]);
  expect(await query({ authors: [old.pubkey], kinds: [10011], '#i': ['github:fixture'] })).toEqual([]);
});

test('native kind0 search indexes name and display_name prefixes and excludes replaced metadata', async () => {
  const key = generatePrivateKey();
  const old = fixture({ kind: 0, tags: [], content: JSON.stringify({ name: 'zzoldfixture' }) }, key);
  const current = fixture({ kind: 0, tags: [], created_at: old.created_at + 1,
    content: JSON.stringify({ name: 'zznativefixture', display_name: 'zzdisplayfixture' }) }, key);
  await publish(old); await publish(current);
  for (let attempt = 0; attempt < 25; attempt++) {
    const found = await query({ kinds: [0], search: 'zznative', authors: [current.pubkey] });
    if (found.some((e) => e.id === current.id)) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  for (const search of ['zznative', 'zzdisplay']) {
    expect((await query({ kinds: [0], search, authors: [current.pubkey] })).map((e) => e.id)).toEqual([current.id]);
  }
  expect(await query({ kinds: [0], search: 'zzold', authors: [current.pubkey] })).toEqual([]);
});
