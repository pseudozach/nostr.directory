import { expect, test } from 'vitest';
import * as editor from '../../src/identity/editor';
import { fixture } from './fixtures';

test('removing one identity preserves content, extensions, duplicates and order without mutating the base', () => {
  const base = fixture({ content: 'opaque content', tags: [
    ['client', 'other', 'extension'], ['i', 'custom:Opaque', 'proof', 'extra'],
    ['i', 'github:remove', 'gist'], ['i', 'custom:Opaque', 'proof', 'extra'],
  ] });
  const original = JSON.stringify(base);
  expect(typeof editor.editIdentityList).toBe('function');
  const result = editor.editIdentityList(base, base, { remove: 2 }, base.created_at + 1);
  expect(result).toEqual({ kind: 10011, pubkey: base.pubkey, created_at: base.created_at + 1,
    content: base.content, tags: [base.tags[0], base.tags[1], base.tags[3]] });
  result.tags[0]![1] = 'changed';
  expect(JSON.stringify(base)).toBe(original);
});

test('unavailable current-list observations block editing instead of creating an empty list', () => {
  const base = fixture();
  expect(() => editor.editIdentityList(base, undefined, { remove: 0 }, base.created_at + 1))
    .toThrow('current list unavailable');
});

test('changed observed base requires review rather than overwriting a newer list', () => {
  const base = fixture();
  const other = fixture({ created_at: base.created_at + 1 });
  expect(() => editor.editIdentityList(base, other, { remove: 0 }, base.created_at + 2))
    .toThrow('list changed; review latest');
});

test('invalid or non-identity signed observations cannot become an editable base', () => {
  const signed = fixture();
  for (const base of [{ ...signed, tags: [['i', 'github:forged', 'gist']] }, fixture({ kind: 0 })]) {
    expect(() => editor.editIdentityList(base, base, { remove: 0 }, base.created_at + 1))
      .toThrow('invalid identity list');
  }
});

test('append retains the complete original list and adds the reviewed raw identity at the end', () => {
  const base = fixture();
  const tag = ['i', 'custom:Case', 'opaque', 'extension'];
  const result = editor.editIdentityList(base, base, { append: tag }, base.created_at + 1);
  expect(result.tags).toEqual([...base.tags, tag]);
  result.tags[1]![2] = 'mutated';
  expect(tag[2]).toBe('opaque');
});

test('edits reject timestamps that cannot supersede the observed current list', () => {
  const base = fixture();
  for (const time of [base.created_at, base.created_at - 1, NaN, 1.5, Infinity]) {
    expect(() => editor.editIdentityList(base, base, { remove: 0 }, time)).toThrow('invalid replacement timestamp');
  }
});

test('only a valid identity position or bounded string identity tag may be edited', () => {
  const base = fixture({ tags: [['client', 'preserve'], ['i', 'github:fixture', 'gist']] });
  const edits = [{ remove: -1 }, { remove: 0 }, { remove: 2 }, { remove: 0.5 },
    { append: ['p', 'not-identity'] }, { append: ['i', 'no-provider', 'proof'] },
    { append: ['i', 'custom:x', { unsupported: true }] }, { append: ['i', 'custom:x', 'x'.repeat(17000)] }];
  for (const edit of edits) {
    expect(() => editor.editIdentityList(base, base, edit as any, base.created_at + 1)).toThrow('invalid identity edit');
  }
});
