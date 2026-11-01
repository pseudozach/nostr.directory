import { expect, test } from 'vitest';
import * as events from '../../src/identity/events';

test('a newer empty list replaces every old identity without dropping extensions', () => {
  const old = { id: 'a'.repeat(64), created_at: 1, tags: [['i', 'github:test', 'gist']] };
  const empty = { id: 'b'.repeat(64), created_at: 2, tags: [['x', 'extension']], content: 'opaque' };
  expect(events).toHaveProperty('latest');
  expect(events.latest(old, empty)).toBe(empty);
});

test('equal-time lists converge on the lowest lexical ID in either arrival order', () => {
  const high = { id: 'f'.repeat(64), created_at: 5 };
  const low = { id: '0'.repeat(64), created_at: 5 };
  expect(events.latest(high, low)).toBe(low);
  expect(events.latest(low, high)).toBe(low);
});
