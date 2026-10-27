const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

test('NIP05 returns verified identity even when optional legacy relay lookup fails, with a strict timeout', async () => {
  const source = fs.readFileSync(`${__dirname}/../src/pages/api/nostr.ts`, 'utf8');
  const hex = 'a'.repeat(64); let options; let lookedUp;
  const axios = { get: async (_url, config) => { options = config; throw Error('legacy unavailable'); } };
  const db = { collection: () => ({ where: (_field, _operator, value) => { lookedUp = value; return { get: async () => ({ forEach: callback => {
    callback({ data: () => ({ verified: true, hexPubKey: hex }) });
    callback({ data: () => ({ verified: false, hexPubKey: 'b'.repeat(64) }) });
  } }) }; } }) };
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, process: { env: { POSTGREST_API: 'https://legacy.example.invalid' } }, require: name => {
    if (name === 'axios') return axios;
    if (name === '../../utils/firebase') return { db };
    throw Error(`Unexpected dependency ${name}`);
  } });
  let status; let body;
  const res = { status: code => { status = code; return res; }, json: value => { body = value; } };
  await exports.default({ query: { name: 'Jack' } }, res);
  assert.equal(status, 200);
  assert.equal(lookedUp, 'jack');
  assert.equal(body.names.jack, hex);
  assert.equal(options.timeout, 2000, 'optional enrichment must not consume the serverless request deadline');
});
