const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// Compile real application helpers in memory; no build outputs or test framework.
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    module._compile(ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
      fileName: filename,
    }).outputText, filename);
  };
}
const analytics = () => {
  const path = `${__dirname}/../src/utils/analytics.ts`;
  assert.ok(fs.existsSync(path), 'analytics privacy helper exists');
  return require(path);
};
const browser = (hostname = 'nostr.directory') => ({
  location: { hostname, href: `https://${hostname}/` },
  navigator: {}, localStorage: { getItem: () => null },
});

test('permits only production on the two exact public hostnames, never SSR', () => {
  const { mayTrack } = analytics();
  assert.equal(mayTrack(undefined, 'production'), false);
  for (const host of ['nostr.directory', 'www.nostr.directory']) {
    assert.equal(mayTrack(browser(host), 'production'), true);
    assert.equal(mayTrack(browser(host), 'development'), false);
    assert.equal(mayTrack(browser(host), 'test'), false);
  }
  for (const host of ['localhost', '127.0.0.1', 'nostr-directory.vercel.app', 'nostr.directory.attacker.test', 'preview.nostr.directory']) {
    assert.equal(mayTrack(browser(host), 'production'), false);
  }
});

test('fails closed for DNT, GPC, opt-out, automation and inaccessible storage', () => {
  const { mayTrack } = analytics();
  for (const mutate of [
    b => { b.navigator.doNotTrack = '1'; },
    b => { b.navigator.doNotTrack = 'yes'; },
    b => { b.doNotTrack = '1'; },
    b => { b.navigator.msDoNotTrack = '1'; },
    b => { b.navigator.globalPrivacyControl = true; },
    b => { b.navigator.webdriver = true; },
    b => { b.localStorage.getItem = () => 'true'; },
    b => { b.localStorage.getItem = () => { throw Error('blocked'); }; },
  ]) {
    const b = browser(); mutate(b);
    assert.equal(mayTrack(b, 'production'), false);
  }
  const b = browser(); b.navigator.doNotTrack = '0';
  assert.equal(mayTrack(b, 'production'), true);
});

test('scrubs event URLs, profile identifiers, referrers and all unapproved payload fields', () => {
  const { sanitizeRequest } = analytics();
  assert.equal(typeof sanitizeRequest, 'function');
  const dirty = {
    n: 'pageview', d: 'nostr.directory',
    u: 'https://user:password@nostr.directory/p/npub-secret?key=nsec-secret#signed',
    r: 'https://user:password@referrer.test/private-key?token=secret#payload',
    p: { text: 'private text' }, $: { amount: 'signed' }, arbitrary: 'secret',
  };
  assert.deepEqual(sanitizeRequest(dirty, 'nostr.directory'), {
    n: 'pageview', d: 'nostr.directory', u: 'https://nostr.directory/p/[id]', r: 'https://referrer.test/',
  });
  for (const route of ['/', '/twitter', '/stats']) {
    assert.equal(sanitizeRequest({ ...dirty, u: `https://www.nostr.directory${route}?secret=yes#key` }, 'nostr.directory').u, `https://www.nostr.directory${route}`);
  }
  assert.equal(sanitizeRequest({ ...dirty, u: 'https://nostr.directory/unknown/secret' }, 'nostr.directory').u, 'https://nostr.directory/[redacted]');
  assert.equal(sanitizeRequest({ ...dirty, u: 'https://attacker.test/' }, 'nostr.directory'), null);
  assert.equal(sanitizeRequest({ ...dirty, n: 'free text' }, 'nostr.directory'), null);
  for (const n of ['Outbound Link: Click', 'File Download']) {
    assert.deepEqual(sanitizeRequest({ ...dirty, n, p: { url: 'https://user:pass@target.test/nsec-secret/file.json?payload=signed#secret', text: 'secret' } }, 'nostr.directory').p, { url: 'https://target.test/' });
    assert.equal(sanitizeRequest({ ...dirty, n, p: { url: 'nostr:private' } }, 'nostr.directory'), null);
  }
});

const harness = () => {
  const b = browser(); const listeners = new Map(); const calls = []; const configs = [];
  const router = { asPath: '/', events: {
    on: (name, fn) => { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); },
    off: (name, fn) => listeners.get(name)?.delete(fn),
  } };
  const navigate = (path, name = 'routeChangeComplete') => {
    router.asPath = path; b.location.href = `https://nostr.directory${path}`;
    for (const fn of listeners.get(name) || []) fn(path);
  };
  const tracker = { init: c => configs.push(c), track: (n, options) => calls.push({ n, ...options }) };
  return { b, router, tracker, calls, configs, navigate, listeners };
};

test('initializes once globally with explicit manual and safe built-in activity options', () => {
  const { startAnalytics } = analytics();
  assert.equal(typeof startAnalytics, 'function');
  const h = harness();
  const stop = startAnalytics(h.b, h.router, h.tracker, 'production');
  stop();
  startAnalytics(h.b, h.router, h.tracker, 'production');
  assert.equal(h.configs.length, 1);
  assert.equal(h.calls.length, 1);
  const c = h.configs[0];
  assert.equal(c.domain, 'nostr.directory');
  assert.equal(c.endpoint, 'https://plausible.physicalaiguide.com/api/event');
  assert.equal(c.autoCapturePageviews, false);
  assert.equal(c.hashBasedRouting, false);
  assert.equal(c.outboundLinks, true);
  assert.equal(c.fileDownloads, true);
  assert.equal(c.formSubmissions, false);
  assert.equal(c.bindToWindow, false);
  assert.equal(c.logging, false);
  assert.deepEqual(c.transformRequest({ n: h.calls[0].n, u: h.calls[0].url, d: c.domain }), {
    n: 'pageview', u: 'https://nostr.directory/', d: 'nostr.directory', r: null,
  });
  h.b.navigator.globalPrivacyControl = true;
  assert.equal(c.transformRequest({ n: 'File Download', u: h.b.location.href, d: c.domain, p: { url: 'https://target.test/file.pdf' } }), null);
  const denied = harness(); denied.b.navigator.webdriver = true;
  startAnalytics(denied.b, denied.router, denied.tracker, 'production');
  assert.equal(denied.configs.length, 0);
  assert.equal(denied.calls.length, 0);
});

test('tracks completed client navigation once, excludes hash-only and duplicate updates, cleans up', () => {
  const { startAnalytics } = analytics();
  const h = harness();
  const stop = startAnalytics(h.b, h.router, h.tracker, 'production');
  h.navigate('/#private', 'hashChangeComplete');
  h.navigate('/#private');
  assert.equal(h.calls.length, 1);
  h.navigate('/stats?token=secret#signed');
  h.navigate('/stats?token=secret#different');
  assert.equal(h.calls.length, 2);
  h.navigate('/p/npub-one'); h.navigate('/p/npub-two');
  assert.equal(h.calls.length, 4, 'distinct profiles are separate visits even though aggregate URL is identical');
  h.navigate('/twitter', 'routeChangeError');
  assert.equal(h.calls.length, 4);
  h.b.navigator.doNotTrack = '1'; h.navigate('/twitter');
  assert.equal(h.calls.length, 4, 'rechecks privacy before dispatch');
  stop();
  assert.equal(h.listeners.get('routeChangeComplete').size, 0);
  h.navigate('/stats'); assert.equal(h.calls.length, 4);
});

test('real official tracker emits only sanitized pageviews and activity, never ungated engagement', async () => {
  const vm = require('node:vm');
  const h = harness(); const requests = []; const dom = new Map();
  const on = (name, fn) => { if (!dom.has(name)) dom.set(name, []); dom.get(name).push(fn); };
  const dispatch = (name, event = {}) => { for (const fn of dom.get(name) || []) fn({ type: name, ...event }); };
  h.b.location = new URL('https://nostr.directory/p/npub-secret?key=nsec-secret#payload');
  h.router.asPath = '/p/npub-secret?key=nsec-secret#payload';
  Object.assign(h.b, { addEventListener: on, innerHeight: 800, scrollY: 0 });
  const document = {
    addEventListener: on, visibilityState: 'visible', hasFocus: () => true,
    referrer: 'https://referrer.test/secret?key=nsec-secret', body: {}, documentElement: {},
  };
  const fetch = (endpoint, options) => { requests.push({ endpoint, body: JSON.parse(options.body) }); return Promise.resolve({ status: 202 }); };
  h.b.fetch = fetch;
  const context = vm.createContext({ window: h.b, location: h.b.location, document, fetch, URL, console, Date,
    ResizeObserver: class { observe() {} },
  });
  const official = fs.readFileSync(require.resolve('@plausible-analytics/tracker'), 'utf8');
  vm.runInContext(official.replace(/export \{[^}]+\}/, 'globalThis.tracker = { init, track }'), context);
  analytics().startAnalytics(h.b, h.router, context.tracker, 'production');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.n, 'pageview');
  assert.equal(requests[0].body.u, 'https://nostr.directory/p/[id]');
  assert.equal(requests[0].endpoint, 'https://plausible.physicalaiguide.com/api/event');
  const link = (href) => { const u = new URL(href); return { tagName: 'A', href, host: u.host, parentNode: null }; };
  dispatch('click', { target: link('https://target.test/secret?key=nsec-secret#payload') });
  dispatch('click', { target: link('https://nostr.directory/private/export.pdf?token=secret') });
  assert.deepEqual(requests.map(r => r.body.n), ['pageview', 'Outbound Link: Click', 'File Download']);
  assert.equal(requests[1].body.p.url, 'https://target.test/');
  assert.equal(requests[2].body.p.url, 'https://nostr.directory/');
  assert.doesNotMatch(JSON.stringify(requests), /nsec-secret|npub-secret|token|payload|\/private/);
  const nativePageviewClasses = ['plausible-event-name=pageview'];
  nativePageviewClasses.item = index => nativePageviewClasses[index];
  dispatch('click', { target: { tagName: 'BUTTON', classList: nativePageviewClasses, parentNode: null } });
  assert.equal(requests.length, 3, 'DOM custom events cannot enable native pageview/engagement transport');
  h.b.navigator.globalPrivacyControl = true;
  dispatch('click', { target: link('https://target.test/private') });
  document.visibilityState = 'hidden'; dispatch('blur'); dispatch('visibilitychange');
  assert.equal(requests.length, 3, 'no internal engagement transport bypasses the opt-out/transform');
  await Promise.resolve();
});

test('loads tracker only for eligible clients, cancels late loading and handles unavailable analytics', async () => {
  const { attachAnalytics } = analytics();
  assert.equal(typeof attachAnalytics, 'function');
  const h = harness(); let imports = 0;
  const load = async () => { imports += 1; return h.tracker; };
  attachAnalytics(undefined, h.router, 'production', load);
  attachAnalytics(browser('localhost'), h.router, 'production', load);
  attachAnalytics(h.b, h.router, 'development', load);
  assert.equal(imports, 0);
  const stop = attachAnalytics(h.b, h.router, 'production', load);
  await Promise.resolve();
  assert.equal(imports, 1); assert.equal(h.calls.length, 1);
  stop(); assert.equal(h.listeners.get('routeChangeComplete').size, 0);
  const delayed = harness(); let resolve;
  const cancel = attachAnalytics(delayed.b, delayed.router, 'production', () => new Promise(r => { resolve = r; }));
  cancel(); resolve(delayed.tracker); await Promise.resolve();
  assert.equal(delayed.configs.length, 0);
  attachAnalytics(delayed.b, delayed.router, 'production', async () => { throw Error('blocked import'); });
  await new Promise(r => setImmediate(r));
  assert.equal(delayed.calls.length, 0);
});

const source = (path) => fs.readFileSync(`${__dirname}/../${path}`, 'utf8');

test('removes GA configuration while preserving Firebase auth and Firestore', () => {
  const firebase = source('src/utils/firebase.ts');
  assert.doesNotMatch(firebase + source('.env.sample'), /measurementId|FIREBASE_+MEASUREMENT_ID/);
  assert.match(firebase, /import 'firebase\/auth'/);
  assert.match(firebase, /import 'firebase\/firestore'/);
  assert.match(firebase, /initializeApp\(firebaseConfig\)/);
  assert.match(firebase, /export \{ db, auth, twitterProvider \}/);
});
