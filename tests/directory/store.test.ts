import { afterEach, expect, test } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as store from '../../services/directory/src/store';
import { generatePrivateKey } from 'nostr-tools';
import { fixture } from '../identity/fixtures';

const directories: string[] = [];
afterEach(() => { for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function database() {
  const dir = mkdtempSync(join(tmpdir(), 'nostr-v2-test-'));
  directories.push(dir);
  return join(dir, 'derived.sqlite');
}

test('persists current identity projection across closing and reopening SQLite', () => {
  expect(store).toHaveProperty('DirectoryStore');
  const path = database();
  const event = fixture();
  let db = new store.DirectoryStore(path);
  try {
    db.apply(event);
    expect(db.claims(event.pubkey)).toMatchObject([{ event_id: event.id, position: 0, platform: 'github', identity: 'fixture', raw_tag_json: JSON.stringify(event.tags[0]) }]);
  } finally { db.close(); }
  db = new store.DirectoryStore(path);
  try { expect(db.claims(event.pubkey)).toHaveLength(1); }
  finally { db.close(); }
});

test('refuses a tampered signed event before mutating the projection', () => {
  const valid = fixture();
  const db = new store.DirectoryStore(database());
  try {
    expect(() => db.apply({ ...valid, tags: [['i', 'github:forged', 'gist']] })).toThrow('invalid directory event');
    expect(db.claims(valid.pubkey)).toEqual([]);
  } finally { db.close(); }
});

test('an empty current list removes all active claims', () => {
  const key = generatePrivateKey();
  const old = fixture({}, key);
  const empty = fixture({ created_at: old.created_at + 1, tags: [] }, key);
  const db = new store.DirectoryStore(database());
  try {
    db.apply(old); db.apply(empty);
    expect(db.claims(old.pubkey)).toEqual([]);
  } finally { db.close(); }
});

test('metadata cannot create or remove current kind10011 identities', () => {
  const key = generatePrivateKey();
  const list = fixture({}, key);
  const metadata = fixture({ kind: 0, tags: [['i', 'github:old-format', 'gist']], content: '{}' }, key);
  const db = new store.DirectoryStore(database());
  try {
    db.apply(list); db.apply(metadata);
    expect(db.claims(list.pubkey).map((claim) => claim.event_id)).toEqual([list.id]);
  } finally { db.close(); }
});

test('failed projection rolls back the whole replacement and remains replayable', () => {
  const key = generatePrivateKey();
  const old = fixture({}, key);
  const update = fixture({ created_at: old.created_at + 1, tags: [['i', 'github:new', 'gist'], ['i', 'github:fail', 'gist']] }, key);
  const path = database();
  const db = new store.DirectoryStore(path);
  const connection = new (require('node:sqlite').DatabaseSync)(path);
  try {
    db.apply(old);
    connection.exec("CREATE TRIGGER injected_failure BEFORE INSERT ON identities WHEN NEW.identity = 'fail' BEGIN SELECT RAISE(ABORT, 'injected failure'); END;");
    expect(() => db.apply(update)).toThrow('injected failure');
    expect(db.claims(old.pubkey).map((claim) => claim.event_id)).toEqual([old.id]);
    connection.exec('DROP TRIGGER injected_failure');
    db.apply(update);
    expect(db.claims(old.pubkey).map((claim) => claim.event_id)).toEqual([update.id, update.id]);
  } finally { connection.close(); db.close(); }
});

test('suppression hides a person through replay and SQLite restart', () => {
  const path = database();
  const event = fixture();
  let db = new store.DirectoryStore(path);
  try {
    db.apply(event);
    expect(db.claims(event.pubkey)).toHaveLength(1);
    expect(typeof db.suppress).toBe('function');
    db.suppress(event.pubkey, 'owner-request');
    db.apply(event);
    expect(db.claims(event.pubkey)).toEqual([]);
  } finally { db.close(); }
  db = new store.DirectoryStore(path);
  try {
    db.apply(event);
    expect(db.claims(event.pubkey)).toEqual([]);
  } finally { db.close(); }
});

test('a durable source checkpoint advances only with committed projection', () => {
  const path = database();
  const event = fixture();
  const checkpoint = { source: 'peer-a', filterHash: 'kinds-0-10011', watermark: 1700000000 };
  let db = new store.DirectoryStore(path);
  const connection = new (require('node:sqlite').DatabaseSync)(path);
  try {
    expect(typeof db.checkpoint).toBe('function');
    expect(db.checkpoint(checkpoint.source, checkpoint.filterHash)).toBeNull();
    connection.exec("CREATE TRIGGER checkpoint_failure BEFORE INSERT ON identities BEGIN SELECT RAISE(ABORT, 'projection failure'); END;");
    expect(() => db.apply(event, checkpoint)).toThrow('projection failure');
    expect(db.checkpoint(checkpoint.source, checkpoint.filterHash)).toBeNull();
    connection.exec('DROP TRIGGER checkpoint_failure');
    db.apply(event, checkpoint);
  } finally { connection.close(); db.close(); }
  db = new store.DirectoryStore(path);
  try {
    expect(db.checkpoint(checkpoint.source, checkpoint.filterHash)).toBe(1700000000);
  } finally { db.close(); }
});

test('older checkpoint replay never moves a completed watermark backwards', () => {
  const event = fixture();
  const db = new store.DirectoryStore(database());
  try {
    db.apply(event, { source: 'peer-a', filterHash: 'filter-a', watermark: 200 });
    db.apply(event, { source: 'peer-a', filterHash: 'filter-a', watermark: 100 });
    expect(db.checkpoint('peer-a', 'filter-a')).toBe(200);
    expect(db.checkpoint('peer-a', 'different-filter')).toBeNull();
  } finally { db.close(); }
});

test('GitHub identity lookup returns conflicting pubkeys without merging people', () => {
  const db = new store.DirectoryStore(database());
  const first = fixture({ tags: [['i', 'github:CaseHandle', 'gist-a']] });
  const second = fixture({ tags: [['i', 'github:casehandle', 'gist-b']] });
  try {
    db.apply(first); db.apply(second);
    expect(typeof db.lookup).toBe('function');
    expect(db.lookup('github', 'CASEHANDLE').map((claim) => claim.pubkey).sort())
      .toEqual([first.pubkey, second.pubkey].sort());
    expect(db.lookup('github', 'other')).toEqual([]);
  } finally { db.close(); }
});

test('opaque provider identities keep case-sensitive semantics', () => {
  const db = new store.DirectoryStore(database());
  const event = fixture({ tags: [['i', 'custom:AbC', 'opaque']] });
  try {
    db.apply(event);
    expect(db.lookup('custom', 'abc')).toEqual([]);
    expect(db.lookup('custom', 'AbC').map((claim) => claim.event_id)).toEqual([event.id]);
  } finally { db.close(); }
});

test('suppressed claims never appear in identity lookup', () => {
  const db = new store.DirectoryStore(database());
  const event = fixture();
  try {
    db.apply(event);
    expect(db.lookup('github', 'fixture')).toHaveLength(1);
    db.suppress(event.pubkey, 'owner-request');
    expect(db.lookup('github', 'fixture')).toEqual([]);
  } finally { db.close(); }
});

test('identity lookup has a hard bounded result count', () => {
  const db = new store.DirectoryStore(database());
  try {
    for (let n = 0; n < 3; n++) db.apply(fixture());
    expect(db.lookup('github', 'fixture', 1)).toHaveLength(1);
    for (const limit of [0, -1, 101, 1.5, NaN]) {
      expect(() => db.lookup('github', 'fixture', limit)).toThrow('invalid lookup');
    }
    expect(() => db.lookup('github', 'x'.repeat(301))).toThrow('invalid lookup');
    expect(() => db.lookup('', 'fixture')).toThrow('invalid lookup');
    expect(() => db.lookup('github', '')).toThrow('invalid lookup');
  } finally { db.close(); }
});

test('old replay cannot resurrect a removed identity after SQLite restart', () => {
  const key = generatePrivateKey();
  const old = fixture({}, key);
  const empty = fixture({ created_at: old.created_at + 1, tags: [] }, key);
  const path = database();
  let db = new store.DirectoryStore(path);
  try { db.apply(old); db.apply(empty); } finally { db.close(); }
  db = new store.DirectoryStore(path);
  try {
    db.apply(old);
    expect(db.claims(old.pubkey)).toEqual([]);
  } finally { db.close(); }
});
