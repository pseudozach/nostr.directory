import { expect, test } from 'vitest';
import { DiscoveryWorker } from '../../services/directory/src/discovery';
import { DirectoryStore } from '../../services/directory/src/store';
import { fixture } from '../identity/fixtures';

test('bounded discovery prioritizes identity lists and samples them across history, not noisy metadata', async () => {
  const filters: any[] = [];
  const store = new DirectoryStore(':memory:');
  const local = { publish: async () => ({ id: '', accepted: true }), current: async () => null };
  const peer = { query: async (filter: any) => { filters.push(filter); return []; }, close() {} };
  const worker = new DiscoveryWorker(store, local, [{ name: 'fixture', relay: peer as any }], { delayMs: 0 });
  try {
    await worker.tick();
    expect(filters[0].kinds).toEqual([10011]);
    expect(filters[1].kinds).toEqual([10011]);
    expect(filters[1].since).toBe(0);
  } finally { await worker.stop(); store.close(); }
});

test('stop waits for an in-flight durable acknowledgment before shutdown', async () => {
  const store = new DirectoryStore(':memory:');
  const event = fixture();
  let release!: () => void;
  let started!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  const entered = new Promise<void>((resolve) => { started = resolve; });
  const local = { current: async () => event, publish: async () => { started(); await blocked; return { id: event.id, accepted: true }; } };
  const peer = { query: async () => [event], close() {} };
  const worker = new DiscoveryWorker(store, local, [{ name: 'fixture', relay: peer as any }], { delayMs: 0 });
  const running = worker.tick();
  try {
    await entered;
    let done = false;
    const stopped = Promise.resolve(worker.stop()).then(() => { done = true; });
    await Promise.resolve();
    expect(done).toBe(false);
    release();
    await stopped;
    await running;
    expect(store.roster()).toEqual([event.pubkey]);
  } finally { release(); await running; await worker.stop(); store.close(); }
});
