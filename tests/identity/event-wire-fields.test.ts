import { expect, test } from 'vitest';
import { validateDirectoryEvent } from '../../src/identity/events';
import { fixture } from './fixtures';

test.each(['privateKey', 'nsec', 'accessToken', 'extra'])('rejects unsigned extra field %s instead of forwarding it with a valid signed event', (field) => {
  const event = fixture();
  expect(validateDirectoryEvent(event)).toBe(true);
  expect(validateDirectoryEvent({ ...event, [field]: 'dummy-not-a-real-secret' })).toBe(false);
});
