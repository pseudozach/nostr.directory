import { expect, test } from 'vitest';
import { directoryOrigin } from '../../src/directory/config';

test('production defaults to the existing API hostname without a new secret or service', () => {
  expect(directoryOrigin({})).toBe('https://api.nostr.directory');
});
test('an explicit deployment or local test origin is preserved', () => {
  expect(directoryOrigin({ DIRECTORY_SERVICE_ORIGIN: 'http://127.0.0.1:18140' })).toBe('http://127.0.0.1:18140');
});
