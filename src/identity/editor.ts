import { validateDirectoryEvent } from './events';
import type { DirectoryEvent } from './events';

export type IdentityDraft = Pick<
  DirectoryEvent,
  'kind' | 'pubkey' | 'created_at' | 'tags' | 'content'
>;

/** Operates on a freshly observed list; never signs or publishes. */
export function editIdentityList(
  base: DirectoryEvent,
  current: DirectoryEvent | undefined,
  edit: { remove: number } | { append: string[] },
  createdAt: number
): IdentityDraft {
  if (!current) throw new Error('current list unavailable');
  if (
    !validateDirectoryEvent(base) ||
    base.kind !== 10011 ||
    !validateDirectoryEvent(current) ||
    current.kind !== 10011
  )
    throw new Error('invalid identity list');
  if (current.id !== base.id) throw new Error('list changed; review latest');
  if (!Number.isSafeInteger(createdAt) || createdAt <= base.created_at)
    throw new Error('invalid replacement timestamp');
  if ('remove' in edit) {
    if (
      !Number.isInteger(edit.remove) ||
      edit.remove < 0 ||
      base.tags[edit.remove]?.[0] !== 'i'
    ) {
      throw new Error('invalid identity edit');
    }
  } else if (
    !Array.isArray(edit.append) ||
    edit.append[0] !== 'i' ||
    !/^[^:]+:.+$/.test(edit.append[1] ?? '') ||
    edit.append.length < 3 ||
    edit.append.some((field) => typeof field !== 'string')
  )
    throw new Error('invalid identity edit');
  const tags =
    'remove' in edit
      ? base.tags.filter((_, position) => position !== edit.remove)
      : [...base.tags, edit.append];
  const draft = {
    kind: 10011,
    pubkey: base.pubkey,
    created_at: createdAt,
    content: base.content,
    tags: tags.map((tag) => [...tag]),
  };
  if (
    tags.length > 256 ||
    new TextEncoder().encode(
      JSON.stringify({ ...draft, id: '0'.repeat(64), sig: '0'.repeat(128) })
    ).length > 16384
  )
    throw new Error('invalid identity edit');
  return draft;
}
