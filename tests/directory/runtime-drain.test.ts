import { expect, test, vi } from 'vitest';

import { createRuntime, loadConfig } from '../../services/directory/src/main';

test('runtime drains discovery before closing the durable cache', async () => {
  const runtime = createRuntime(
    loadConfig({
      DIRECTORY_SQLITE_PATH: ':memory:',
      DIRECTORY_PEERS: '',
      DIRECTORY_PROOFS_ENABLED: 'false',
    })
  );
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.spyOn(runtime.discovery, 'stop').mockImplementation(() => gate);
  const closing = runtime.close();
  try {
    await Promise.resolve();
    await Promise.resolve();
    expect(() => runtime.store.roster()).not.toThrow();
  } finally {
    release();
    await closing;
  }
  expect(() => runtime.store.roster()).toThrow();
});
