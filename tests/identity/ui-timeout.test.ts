import { expect, test, vi } from 'vitest';

import { loadPeople } from '../../src/components/directory/PeopleSearch';
import { resolveProfile } from '../../src/components/directory/profile';
import { observeList } from '../../src/components/directory/workflow';

const key = 'a'.repeat(64);
test.each(['search', 'profile', 'list', 'legacy'])(
  '%s requests stop waiting after an explicit deadline, including stalled bodies',
  async (kind) => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const transport = vi.fn(
      async (_url: RequestInfo | URL, options?: RequestInit) => {
        signal = options?.signal ?? undefined;
        return { ok: true, json: () => new Promise(() => {}) } as Response;
      }
    );
    const operations: Record<string, () => Promise<unknown>> = {
      search: () => loadPeople('', '', '', undefined, transport),
      list: () => observeList(key, transport),
      profile: () =>
        resolveProfile(key, () => new Promise(() => {}), transport),
      legacy: () =>
        resolveProfile('oldname', () => new Promise(() => {}), transport),
    };
    const operation = operations[kind]!();
    const checked = expect(operation).rejects.toThrow(/timed out/i);
    try {
      await vi.advanceTimersByTimeAsync(10001);
      await checked;
      if (kind !== 'legacy') expect(signal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  }
);
