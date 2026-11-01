import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { generatePrivateKey } from 'nostr-tools';
import { DirectoryStore } from '../../services/directory/src/store';
import { fixture } from '../identity/fixtures';

import { ingest } from '../../services/directory/src/ingest';

import { AdmissionPolicy } from '../../services/directory/src/policy';

const ingestion = { ingest };

test('final transactional capacity check rejects a reserved author if another connection filled the corpus', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'admission-'));
  const db = new DirectoryStore(join(directory, 'directory.sqlite'));
  const other = new DirectoryStore(join(directory, 'directory.sqlite'));
  new AdmissionPolicy(db, { maxAuthors: 1 });
  new AdmissionPolicy(other, { maxAuthors: 1 });
  const event = fixture();
  const competitor = fixture();
  try {
    await expect(ingest(event, {
      async publish() { return { id: event.id, accepted: true }; },
      async current() { other.apply(competitor); return event; },
    }, db)).rejects.toThrow('corpus full');
    expect(db.roster(true)).toEqual([competitor.pubkey]);
  } finally { db.close(); other.close(); rmSync(directory, { recursive: true }); }
});

test('pending relay publication reserves capacity across ingestion callers before any await', async () => {
  const db = new DirectoryStore(':memory:');
  const policy = new AdmissionPolicy(db, { maxAuthors: 1 });
  const first = fixture();
  const second = fixture();
  let release!: () => void;
  let publications = 0;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const relay = {
    async publish(event: typeof first) {
      publications++;
      if (event.id === first.id) await gate;
      return { id: event.id, accepted: true };
    },
    async current(key: string) { return key === first.pubkey ? first : second; },
  };
  policy.admit(first, 'http');
  const pending = ingest(first, relay, db);
  try {
    // Direct ingestion, discovery's policy, and HTTP must share the same capacity.
    expect(() => new AdmissionPolicy(db, { maxAuthors: 1 }).admit(second, 'peer')).toThrow('corpus full');
    await expect(ingest(second, relay, db)).rejects.toThrow('corpus full');
    expect(publications).toBe(1);
  } finally {
    release();
    await pending;
    expect(db.roster(true)).toEqual([first.pubkey]);
    db.close();
  }
});

test.each(['publish-error', 'rejected', 'wrong-id', 'readback-error', 'missing', 'invalid', 'publish-timeout', 'readback-timeout', 'projection-error'])('releases new-author capacity after %s', async (failure) => {
  vi.useFakeTimers();
  const db = new DirectoryStore(':memory:');
  new AdmissionPolicy(db, { maxAuthors: 1 });
  const event = fixture();
  const next = fixture();
  const apply = failure === 'projection-error' ? vi.spyOn(db, 'apply').mockImplementationOnce(() => { throw new Error('projection failed'); }) : undefined;
  try {
    const result = ingest(event, {
      async publish() {
        if (failure === 'publish-error') throw new Error('publish failed');
        if (failure === 'publish-timeout') return new Promise<never>(() => {});
        return { id: failure === 'wrong-id' ? 'wrong' : event.id, accepted: failure !== 'rejected' };
      },
      async current() {
        if (failure === 'readback-error') throw new Error('readback failed');
        if (failure === 'readback-timeout') return new Promise<never>(() => {});
        if (failure === 'missing') return null;
        return failure === 'invalid' ? { ...event, content: 'forged' } : event;
      },
    }, db).then(() => null, (error: unknown) => error);
    await vi.advanceTimersByTimeAsync(3100);
    expect(await result).toBeInstanceOf(Error);
    expect(db.roster(true)).toEqual([]);
    apply?.mockRestore();
    await ingest(next, {
      async publish() { return { id: next.id, accepted: true }; },
      async current() { return next; },
    }, db);
    expect(db.roster(true)).toEqual([next.pubkey]);
    expect(vi.getTimerCount()).toBe(0);
  } finally { apply?.mockRestore(); db.close(); vi.useRealTimers(); }
});

test.each(['rejected', 'wrong-id'])('refuses %s relay acknowledgement without projection', async (failure) => {
  const event = fixture();
  const db = new DirectoryStore(':memory:');
  let readback = false;
  const relay = {
    async publish() { return { id: failure === 'wrong-id' ? '0'.repeat(64) : event.id, accepted: failure !== 'rejected' }; },
    async current() { readback = true; return event; },
  };
  try {
    await expect(ingest(event, relay, db)).rejects.toThrow('relay did not accept original');
    expect(readback).toBe(false);
    expect(db.claims(event.pubkey)).toEqual([]);
  } finally { db.close(); }
});

test('invalid original never reaches the relay boundary', async () => {
  const valid = fixture();
  const event = { ...valid, content: 'tampered' };
  const db = new DirectoryStore(':memory:');
  let sent = false;
  const relay = {
    async publish() { sent = true; return { id: event.id, accepted: true }; },
    async current() { return valid; },
  };
  try {
    await expect(ingest(event, relay, db)).rejects.toThrow('invalid directory event');
    expect(sent).toBe(false);
    expect(db.claims(valid.pubkey)).toEqual([]);
  } finally { db.close(); }
});

test.each(['other-author', 'other-kind', 'older', 'losing-tie', 'tampered'])('rejects %s readback before projection', async (failure) => {
  const key = generatePrivateKey();
  let event = fixture({}, key);
  let readback = fixture({ created_at: event.created_at + 1 }, key);
  if (failure === 'other-author') readback = fixture();
  if (failure === 'other-kind') readback = fixture({ kind: 0, content: '{}' }, key);
  if (failure === 'older') readback = fixture({ created_at: event.created_at - 1 }, key);
  if (failure === 'tampered') readback = { ...event, content: 'forged' };
  if (failure === 'losing-tie') {
    const pair = [event, fixture({ content: 'tie' }, key)].sort((a, b) => a.id < b.id ? -1 : 1);
    event = pair[0]!; readback = pair[1]!;
  }
  const db = new DirectoryStore(':memory:');
  try {
    await expect(ingest(event, {
      async publish() { return { id: event.id, accepted: true }; },
      async current() { return readback; },
    }, db)).rejects.toThrow('relay readback invalid');
    expect(db.claims(event.pubkey)).toEqual([]);
    expect(db.claims(readback.pubkey)).toEqual([]);
  } finally { db.close(); }
});

test.each(['publish', 'readback'])('times out a hung %s without projecting an empty list', async (phase) => {
  vi.useFakeTimers();
  const testKey = generatePrivateKey();
  const event = fixture({}, testKey);
  const db = new DirectoryStore(':memory:');
  db.apply(event);
  const update = fixture({ created_at: event.created_at + 1, tags: [] }, testKey);
  let signal: AbortSignal | undefined;
  const never = (currentSignal: AbortSignal) => { signal = currentSignal; return new Promise<any>(() => {}); };
  try {
    let finished = false;
    const result = ingest(update, {
      async publish(_event, currentSignal) {
        if (phase === 'publish') return never(currentSignal);
        return { id: update.id, accepted: true };
      },
      async current(_pubkey, _kind, currentSignal) { return never(currentSignal); },
    }, db).then(() => { finished = true; return null; }, (error: Error) => { finished = true; return error; });
    await vi.advanceTimersByTimeAsync(3100);
    expect(finished).toBe(true);
    expect((await result)?.message).toBe('relay timeout');
    expect(signal?.aborted).toBe(true);
    expect(db.claims(event.pubkey).map((claim) => claim.event_id)).toEqual([event.id]);
    expect(vi.getTimerCount()).toBe(0);
  } finally { db.close(); vi.useRealTimers(); }
});

test('projects an unchanged signed original only after matching relay acceptance and readback', async () => {
  const event = fixture();
  const db = new DirectoryStore(':memory:');
  // Deterministic relay boundary double, NOT upstream runtime qualification.
  const relay = {
    async publish(original: unknown) {
      expect(original).toBe(event);
      expect(db.claims(event.pubkey)).toEqual([]);
      return { id: event.id, accepted: true };
    },
    async current(pubkey: string, kind: number) {
      expect([pubkey, kind]).toEqual([event.pubkey, 10011]);
      expect(db.claims(event.pubkey)).toEqual([]);
      return event;
    },
  };
  try {
    expect(typeof ingestion?.ingest).toBe('function');
    await ingestion.ingest(event, relay, db);
    expect(db.claims(event.pubkey).map((claim) => claim.event_id)).toEqual([event.id]);
  } finally { db.close(); }
});
