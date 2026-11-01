import { expect, test, vi } from 'vitest';
import { publishLegacyEvent } from '../../src/identity/legacy-publish';
import { fixture } from './fixtures';

test('legacy publication requires acknowledgement and exact signed readback', async () => {
  const event = fixture({ kind: 3 });
  const relay = { publish: vi.fn(async () => {}), get: vi.fn(async () => event) };
  await expect(publishLegacyEvent(relay, event)).resolves.toBeUndefined();
  expect(relay.publish).toHaveBeenCalledWith(event);
  expect(relay.get).toHaveBeenCalledWith({ ids: [event.id] });
});

test('legacy publication does not claim success on rejected or mismatched readback', async () => {
  const event = fixture({ kind: 3 });
  await expect(publishLegacyEvent({ publish: async () => { throw new Error('rejected'); }, get: async () => event }, event)).rejects.toThrow('rejected');
  await expect(publishLegacyEvent({ publish: async () => {}, get: async () => null }, event)).rejects.toThrow('readback');
});
