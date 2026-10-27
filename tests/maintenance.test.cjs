const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('deployment stays on supported Node 22 rather than silently changing Vercel major', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(__dirname, '../package-lock.json'), 'utf8'));
  assert.equal(pkg.engines?.node, '22.x');
  assert.equal(lock.packages[''].engines?.node, '22.x');
});

test('statistics do not load the unavailable legacy dashboard or claim verified live counts by default', () => {
  const ts = require('typescript');
  for (const ext of ['.ts', '.tsx']) {
    require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
      fileName: filename,
    }).outputText, filename);
  }
  global.React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { Stats } = require('../src/templates/Stats.tsx');
  const html = renderToStaticMarkup(global.React.createElement(Stats));
  assert.doesNotMatch(html, /<iframe/);
  assert.match(html, /No current relay counts can be verified/);
  assert.match(html, /Try loading legacy charts/);
  const copy = fs.readFileSync(path.join(__dirname, '../src/templates/Statistics.tsx'), 'utf8');
  assert.doesNotMatch(copy, /Live Statistics|250\+|Last 1 hour/);
});
