import { expect, test } from 'vitest';
import { DirectoryStore } from '../../services/directory/src/store';
import { AdmissionPolicy } from '../../services/directory/src/policy';
import { fixture } from '../identity/fixtures';

test('overlapping same-author attempts retain their shared slot until the last release', () => {
  const db = new DirectoryStore(':memory:');
  new AdmissionPolicy(db, { maxAuthors: 1 });
  const author = fixture().pubkey;
  const other = fixture().pubkey;
  try {
    const first = db.reserveAuthor(author);
    const second = db.reserveAuthor(author);
    expect(() => db.checkAuthorCapacity(other)).toThrow('corpus full');
    first(); first();
    expect(() => db.checkAuthorCapacity(other)).toThrow('corpus full');
    second();
    expect(() => db.checkAuthorCapacity(other)).not.toThrow();
  } finally { db.close(); }
});

test('durable projection cannot take a slot reserved before relay readback', () => {
  const db = new DirectoryStore(':memory:');
  new AdmissionPolicy(db, { maxAuthors: 1 });
  const event = fixture();
  const release = db.reserveAuthor(event.pubkey);
  try {
    expect(() => db.apply(fixture())).toThrow('corpus full');
    db.apply(event);
    expect(db.roster(true)).toEqual([event.pubkey]);
  } finally { release(); db.close(); }
});

test('durable projection enforces the cap even when an intake bypasses policy', () => {
  const db = new DirectoryStore(':memory:');
  const first = fixture();
  const second = fixture();
  new AdmissionPolicy(db, { maxAuthors: 1 });
  try {
    db.apply(first);
    expect(() => db.apply(second, { source: 'peer', filterHash: 'window', watermark: 10 })).toThrow('corpus full');
    expect(db.checkpoint('peer', 'window')).toBeNull();
    expect(db.roster(true)).toEqual([first.pubkey]);
  } finally { db.close(); }
});

test('author cap reserves existing-author removal while rejecting new admissions', () => {
  const db = new DirectoryStore(':memory:'); const event = fixture(); db.apply(event);
  const policy = new AdmissionPolicy(db, {maxAuthors: 1});
  try {
    expect(() => policy.admit(fixture(), 'worker')).toThrow('corpus full');
    expect(() => policy.admit(event, 'worker')).not.toThrow();
    expect(() => policy.admit({...event, created_at: Math.floor(Date.now()/1000)+7200}, 'worker')).toThrow('invalid event');
  } finally { db.close(); }
});
