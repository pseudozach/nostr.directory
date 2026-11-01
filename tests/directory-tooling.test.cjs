const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');

test('directory runner limits test concurrency on the shared host', () => {
  const config = require('node:fs').readFileSync(resolve('vitest.config.ts'), 'utf8');
  assert.match(config, /maxWorkers:\s*1/);
  assert.match(config, /fileParallelism:\s*false/);
});

test('directory tests use the patched Node22-compatible runner rather than advisory-affected Vitest', () => {
  const manifest = require('../package.json');
  const lock = require('../package-lock.json');
  assert.equal(manifest.devDependencies.vitest, '5.0.5');
  assert.equal(lock.packages['node_modules/vitest'].version, '5.0.5');
  const result = spawnSync(process.execPath, [resolve('node_modules/vitest/vitest.mjs'), '--version'], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /vitest\/5\.0\.5/);
});
