import { expect, test } from 'vitest';
import { DirectoryStore } from '../../services/directory/src/store';
import { DirectorySearch } from '../../services/directory/src/search';
import { fixture } from '../identity/fixtures';

test('native name search merges current identity prefix matches without signature-based verification', async () => {
  const db = new DirectoryStore(':memory:'); const a = fixture({tags:[['i','github:alice','proof']]}); db.apply(a);
  const calls: any[] = [];
  const search = new DirectorySearch(db, {async query(filter:any) { calls.push(filter); return [a]; }} as any);
  try {
    const result = await search.list({q:'ali'});
    expect(calls[0]).toEqual({kinds:[0], search:'ali',limit:500});
    expect(result.items.map(x => x.pubkey)).toEqual([a.pubkey]);
    expect(result.items[0]!.claims[0]!.state).toBe('claim');
    expect(result.items[0]!.currentEvent).toEqual(JSON.parse(JSON.stringify(a)));
    expect((await search.list({q:'ali',state:'verified'})).items).toEqual([]);
    db.suppress(a.pubkey, 'private'); expect((await search.list({})).items).toEqual([]);
  } finally { db.close(); }
});
