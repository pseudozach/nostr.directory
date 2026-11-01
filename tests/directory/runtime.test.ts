import { execFileSync } from 'node:child_process';
import { expect, test } from 'vitest';
import { loadConfig, createRuntime } from '../../services/directory/src/main';

test('runtime config is bounded, explicit, and safe to inspect without connecting', async () => {
  const config = loadConfig({ DIRECTORY_SQLITE_PATH: ':memory:', DIRECTORY_PEERS: '' });
  expect(config).toMatchObject({ host: '127.0.0.1', port: 8080, relayUrl: 'ws://127.0.0.1:4036', peers: [], maxAuthors: 10000, bootstrapAuthors: 300 });
  for (const env of [ { DIRECTORY_PORT: '0' }, { DIRECTORY_MAX_AUTHORS: '10001' }, { DIRECTORY_PEERS: 'https://relay.example' }, { DIRECTORY_RELAY_URL: 'wss://user:pass@relay.example' }, { DIRECTORY_INTERVAL_MS: '1' } ]) expect(() => loadConfig(env)).toThrow();
  const runtime = createRuntime({ ...config, port: 0 });
  expect(runtime.server.listening).toBe(false);
  expect(runtime.store.roster()).toEqual([]);
  await runtime.start();
  expect(runtime.server.listening).toBe(true);
  expect(runtime.store.state('coverage')).toMatchObject({status: 'partial'});
  await runtime.close();
  expect(runtime.server.listening).toBe(false);
});

test('main CLI validates config and prints help without opening peers or a database', () => {
  const cli = (args: string[]) => execFileSync(process.execPath, ['--import', 'tsx', 'services/directory/src/main.ts', ...args], {
    encoding: 'utf8', env: { ...process.env, DIRECTORY_SQLITE_PATH: '/dev/null/not-a-database', DIRECTORY_PEERS: '' }, timeout: 10000,
  });
  expect(JSON.parse(cli(['--check-config']))).toMatchObject({ peers: [], sqlitePath: '/dev/null/not-a-database' });
  expect(cli(['--help'])).toContain('DIRECTORY_RELAY_URL');
});
