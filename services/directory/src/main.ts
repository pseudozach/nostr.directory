/* eslint-disable no-console -- This module is the service CLI. */
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { DiscoveryWorker } from './discovery';
import { AdmissionPolicy } from './policy';
import { ProofWorker } from './proof-worker';
import { DittoRelay } from './relay';
import { createServer } from './server';
import { DirectoryStore } from './store';

export type RuntimeConfig = {
  host: string;
  port: number;
  sqlitePath: string;
  relayUrl: string;
  peers: string[];
  maxAuthors: number;
  bootstrapAuthors: number;
  intervalMs: number;
  proofsEnabled: boolean;
};
export function loadConfig(
  env: Record<string, string | undefined> = process.env
): RuntimeConfig {
  const integer = (key: string, fallback: number, min: number, max: number) => {
    const raw = env[key];
    if (raw !== undefined && !/^\d+$/.test(raw))
      throw new Error(`invalid ${key}`);
    const value = raw === undefined ? fallback : Number(raw);
    if (!Number.isSafeInteger(value) || value < min || value > max)
      throw new Error(`invalid ${key}`);
    return value;
  };
  const relay = (value: string) => {
    const url = new URL(value);
    if (
      !['ws:', 'wss:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.hash
    )
      throw new Error('invalid relay URL');
    return url.toString().replace(/\/$/, '');
  };
  const peers = [
    ...new Set(
      (env.DIRECTORY_PEERS ?? 'wss://relay.primal.net,wss://relay.damus.io')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map(relay)
    ),
  ];
  if (peers.length > 4) throw new Error('maximum four peers');
  const host = env.DIRECTORY_HOST ?? '127.0.0.1';
  const sqlitePath =
    env.DIRECTORY_SQLITE_PATH ?? resolve('data/directory.sqlite');
  if (!host || /[\s/]/.test(host) || !sqlitePath || sqlitePath.includes('\0'))
    throw new Error('invalid host or SQLite path');
  const proofs = env.DIRECTORY_PROOFS_ENABLED ?? 'true';
  if (!['true', 'false'].includes(proofs))
    throw new Error('invalid DIRECTORY_PROOFS_ENABLED');
  const maxAuthors = integer('DIRECTORY_MAX_AUTHORS', 10000, 1, 10000);
  return {
    host,
    port: integer('DIRECTORY_PORT', 8080, 1, 65535),
    sqlitePath,
    relayUrl: relay(env.DIRECTORY_RELAY_URL ?? 'ws://127.0.0.1:4036'),
    peers,
    maxAuthors,
    bootstrapAuthors: Math.min(
      maxAuthors,
      integer('DIRECTORY_BOOTSTRAP_AUTHORS', 300, 1, 300)
    ),
    intervalMs: integer('DIRECTORY_INTERVAL_MS', 60000, 1000, 86400000),
    proofsEnabled: proofs === 'true',
  };
}

/** Construction is lazy: no listening socket, peer connections, timers or requests. */
export function createRuntime(config: RuntimeConfig) {
  if (config.sqlitePath !== ':memory:')
    mkdirSync(dirname(resolve(config.sqlitePath)), { recursive: true });
  const store = new DirectoryStore(config.sqlitePath);
  const relay = new DittoRelay(config.relayUrl);
  const peers = config.peers.map((url) => ({
    name: url,
    relay: new DittoRelay(url),
  }));
  const policy = new AdmissionPolicy(store, { maxAuthors: config.maxAuthors });
  const discovery = new DiscoveryWorker(store, relay, peers, {
    policy,
    bootstrapAuthors: config.bootstrapAuthors,
    intervalMs: config.intervalMs,
  });
  const proofs = config.proofsEnabled
    ? new ProofWorker(store, { intervalMs: config.intervalMs })
    : undefined;
  const server = createServer({ store, relay, policy });
  let closed = false;
  return {
    store,
    server,
    discovery,
    start: async () => {
      if (closed) throw new Error('runtime closed');
      if (server.listening) return;
      await new Promise<void>((done, reject) => {
        server.once('error', reject);
        server.listen(config.port, config.host, () => {
          server.removeListener('error', reject);
          done();
        });
      });
      discovery.start();
      proofs?.start();
    },
    close: async () => {
      if (closed) return;
      closed = true;
      await discovery.stop();
      relay.close();
      peers.forEach((peer) => peer.relay.close());
      await proofs?.stop();
      if (server.listening)
        await new Promise<void>((done, reject) => {
          server.close((error) => (error ? reject(error) : done()));
        });
      store.close();
    },
  };
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  if (args.length === 1 && args[0] === '--help') {
    console.log(`Usage: node --import tsx services/directory/src/main.ts [--check-config|--help]
Runs only when invoked directly. Environment configuration:
DIRECTORY_HOST=127.0.0.1 DIRECTORY_PORT=8080
DIRECTORY_SQLITE_PATH=./data/directory.sqlite
DIRECTORY_RELAY_URL=ws://127.0.0.1:4036 (your own Ditto)
DIRECTORY_PEERS=wss://relay.primal.net,wss://relay.damus.io (empty disables peers; maximum 4)
DIRECTORY_MAX_AUTHORS=10000 DIRECTORY_BOOTSTRAP_AUTHORS=300
DIRECTORY_INTERVAL_MS=60000 DIRECTORY_PROOFS_ENABLED=true
Proof outbound requests are atomically limited to 500/day in SQLite.
--check-config validates and prints configuration without creating a database or connecting.
Coverage is bounded/partial, never global. No relay is installed or launched by this CLI.`);
    return;
  }
  if (args.length && !(args.length === 1 && args[0] === '--check-config'))
    throw new Error('unknown arguments; use --help');
  const config = loadConfig();
  if (args[0] === '--check-config') {
    console.log(JSON.stringify(config, null, 2));
    return;
  }
  const runtime = createRuntime(config);
  try {
    await runtime.start();
  } catch (error) {
    await runtime.close();
    throw error;
  }
  const stop = () => {
    runtime.close().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  console.log(
    `directory listening on ${config.host}:${config.port}; coverage partial`
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'startup failed');
    process.exitCode = 1;
  });
}
