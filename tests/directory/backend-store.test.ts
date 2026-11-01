import { test, expect } from 'vitest';
import { DirectoryStore } from '../../services/directory/src/store';
import { fixture } from '../identity/fixtures';

test('retains bounded current metadata, roster and original current list for editing', () => {
  const db = new DirectoryStore(':memory:');
  const event = fixture();
  try {
    db.apply(event);
    expect(db.roster()).toEqual([event.pubkey]);
    expect(db.current(event.pubkey, 10011)).toEqual(event);
    const metadata = fixture({kind: 0, content: JSON.stringify({ name: 'Alice', secret: 'discard' })});
    db.apply(metadata);
    expect(db.metadata(metadata.pubkey)).toEqual({name: 'Alice'});
    db.suppress(event.pubkey, 'hidden');
    expect(db.roster()).not.toContain(event.pubkey);
  } finally { db.close(); }
});
