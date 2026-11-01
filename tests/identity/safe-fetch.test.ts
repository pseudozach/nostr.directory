import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { IncomingMessage } from 'node:http';
import { request, RequestOptions } from 'node:https';
import { createConnection, createServer } from 'node:net';
import { Readable } from 'node:stream';
import { createSecureContext } from 'node:tls';

import { expect, test, vi } from 'vitest';

import {
  isPublicAddress,
  productionNetwork,
  SafeResponse,
  safeFetchJson,
} from '../../services/directory/src/safe-fetch';

vi.mock('node:https', () => ({ request: vi.fn() }));

test.each([
  '0.1.2.3',
  '10.0.0.1',
  '127.0.0.1',
  '169.254.169.254',
  '172.16.0.1',
  '172.31.255.255',
  '192.168.1.1',
  '192.0.0.1',
  '192.0.2.1',
  '192.88.99.1',
  '100.64.0.1',
  '100.127.255.255',
  '198.18.0.1',
  '198.19.255.255',
  '198.51.100.1',
  '203.0.113.1',
  '224.0.0.1',
  '240.0.0.1',
  '255.255.255.255',
  '::',
  '::1',
  '::ffff:8.8.8.8',
  '::ffff:808:808',
  '::ffff:0:808:808',
  '64:ff9b::808:808',
  '64:ff9b:1::1',
  '100::1',
  'fc00::1',
  'fe80::1',
  'ff02::1',
  '2001::1',
  '2001:10::1',
  '2001:db8::1',
  '2002:808:808::1',
  '3fff::1',
  'not-an-address',
  '2606:4700::1%eth0',
])('denies reserved/nonpublic address %s', (ip) => {
  expect(isPublicAddress(ip)).toBe(false);
});

test.each([
  [],
  [{ address: '8.8.8.8', family: 6 }],
  [
    { address: '8.8.8.8', family: 4 },
    { address: '127.0.0.1', family: 4 },
  ],
  [
    { address: '2606:4700::1111', family: 6 },
    { address: '::ffff:7f00:1', family: 6 },
  ],
  [
    { address: '8.8.8.8', family: 4 },
    { address: 'fe80::1', family: 6 },
  ],
])(
  'rejects the whole DNS answer set %# before connecting',
  async (...addresses) => {
    const connect = vi.fn();
    await expect(
      safeFetchJson('https://example.com/data', {
        resolve: async () => addresses,
        request: connect,
      })
    ).rejects.toThrow('blocked-address');
    expect(connect).not.toHaveBeenCalled();
  }
);

test('accepts global IPv4 and IPv6 addresses', () => {
  expect(isPublicAddress('8.8.8.8')).toBe(true);
  expect(isPublicAddress('2606:4700:4700::1111')).toBe(true);
});

test('pins vetted connection address while retaining TLS hostname', async () => {
  const result = await safeFetchJson('https://example.com/data', {
    resolve: async () => [{ address: '8.8.8.8', family: 4 }],
    request: async (url, options) => {
      expect(url.hostname).toBe('example.com');
      expect(options.servername).toBe('example.com');
      expect(options.address).toBe('8.8.8.8');
      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: Readable.from(['{"ok":true}']),
      };
    },
  });
  expect(result).toEqual({ ok: true });
});

test.each([
  'http://example.com',
  'https://u:p@example.com',
  'https://example.com:444',
  'https://127.0.0.1',
  'https://[::1]',
  'https://0x7f000001',
  'https://2130706433',
  'https://example.com/#fragment',
])('blocks unsafe URL %s before DNS', async (url) => {
  const resolve = vi.fn();
  await expect(
    safeFetchJson(url, { resolve, request: vi.fn() })
  ).rejects.toThrow('blocked-url');
  expect(resolve).not.toHaveBeenCalled();
});

test.each([
  [301, { location: 'https://127.0.0.1' }, '{}', 'http-301'],
  [302, { location: 'https://private.test' }, '{}', 'http-302'],
  [307, { location: 'http://169.254.169.254' }, '{}', 'http-307'],
  [308, { location: '/redirect' }, '{}', 'http-308'],
  [200, { 'content-encoding': 'gzip' }, '{}', 'compressed-response'],
  [200, { 'content-encoding': 'br' }, '{}', 'compressed-response'],
  [
    200,
    { 'content-encoding': ['identity', 'gzip'] },
    '{}',
    'compressed-response',
  ],
  [200, { 'content-encoding': 'identity, gzip' }, '{}', 'compressed-response'],
  [200, { 'content-type': 'text/html' }, '{}', 'not-json'],
  [
    200,
    { 'content-type': 'application/json', 'content-length': '100' },
    '{}',
    'body-limit',
  ],
  [
    200,
    { 'content-type': 'application/json', 'content-length': '2' },
    '123456',
    'body-limit',
  ],
] as Array<[number, SafeResponse['headers'], string, string]>)(
  'blocks unsafe response %# without following or reading its body',
  async (status, headers, body, error) => {
    const connect = vi.fn(async () => ({
      status,
      headers,
      body: Readable.from([body]),
    }));
    await expect(
      safeFetchJson(
        'https://example.com',
        {
          resolve: async () => [{ address: '8.8.8.8', family: 4 }],
          request: connect,
        },
        { maxBytes: 4 }
      )
    ).rejects.toThrow(error);
    expect(connect).toHaveBeenCalledTimes(1);
  }
);

test('Node22 pinned lookup supports both scalar and all-address consumers without DNS', async () => {
  const req = Object.assign(new EventEmitter(), { end: vi.fn() });
  vi.mocked(request).mockReturnValueOnce(
    req as unknown as ReturnType<typeof request>
  );
  const response = productionNetwork.request(
    new URL('https://proof.example/data'),
    {
      address: '127.0.0.1',
      family: 4,
      servername: 'proof.example',
      signal: new AbortController().signal,
    }
  );
  const rejected = expect(response).rejects.toThrow('fixture-done');
  const options = vi.mocked(request).mock.calls.at(-1)![1] as RequestOptions;
  expect(options).toMatchObject({ agent: false, servername: 'proof.example' });
  const lookup = options.lookup as (
    host: string,
    opts: { all: boolean },
    cb: (error: Error | null, address: unknown, family?: number) => void
  ) => void;
  const scalar = vi.fn();
  const all = vi.fn();
  lookup('proof.example', { all: false }, scalar);
  lookup('proof.example', { all: true }, all);
  req.emit('error', new Error('fixture-done'));
  await rejected;
  expect(scalar).toHaveBeenCalledWith(null, '127.0.0.1', 4);
  expect(all).toHaveBeenCalledWith(null, [{ address: '127.0.0.1', family: 4 }]);
  expect(options.rejectUnauthorized).not.toBe(false);
  expect(options.checkServerIdentity).toBeUndefined();
  // Only the credential-free --network none Docker harness may open a fixture listener.
  if (process.env.PROOF_NETWORK_FIXTURE !== '1') return;
  const server = createServer((socket) => socket.end());
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('fixture-address');
    await new Promise<void>((resolve, reject) => {
      const socket = createConnection({
        host: 'proof.example',
        port: address.port,
        lookup: options.lookup,
        autoSelectFamily: true,
      });
      socket.once('error', reject);
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});

test.skipIf(process.env.PROOF_NETWORK_FIXTURE !== '1')(
  'Node22 HTTPS uses pinned lookup, original Host/SNI, and real certificate hostname validation',
  async () => {
    const native = await vi.importActual<typeof import('node:https')>(
      'node:https'
    );
    // The harness generates disposable dummy credentials; no owner credentials are mounted.
    const cert = readFileSync('/work/fixture-cert.pem');
    const key = readFileSync('/work/fixture-key.pem');
    const context = createSecureContext({ cert, key });
    const servernames: string[] = [];
    let host: string | undefined;
    let path: string | undefined;
    const server = native.createServer(
      {
        cert,
        key,
        SNICallback: (servername, callback) => {
          servernames.push(servername);
          callback(null, context);
        },
      },
      (req, res) => {
        host = req.headers.host;
        path = req.url;
        res.setHeader('Content-Type', 'application/json');
        res.end('{"ok":true}');
      }
    );
    server.on('tlsClientError', () => {});
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    // Add only the test CA: sockets, pinned lookup and certificate checks stay native.
    vi.mocked(request).mockImplementation(((
      url: URL,
      options: RequestOptions,
      callback: (response: IncomingMessage) => void
    ) =>
      native.request(
        url,
        { ...options, ca: cert },
        callback
      )) as typeof request);
    const controller = new AbortController();
    try {
      const address = server.address();
      if (!address || typeof address === 'string')
        throw new Error('fixture-address');
      const url = new URL(`https://proof.example:${address.port}/data`);
      const options = {
        address: '127.0.0.1',
        family: 4,
        servername: 'proof.example',
        signal: controller.signal,
      };
      const response = await productionNetwork.request(url, options);
      expect(response.status).toBe(200);
      const chunks = await (response.body as Readable).toArray();
      expect(Buffer.concat(chunks).toString('utf8')).toBe('{"ok":true}');
      expect(host).toBe(`proof.example:${address.port}`);
      expect(path).toBe('/data');
      expect(servernames).toEqual(['proof.example']);
      await expect(
        productionNetwork.request(url, {
          ...options,
          servername: 'wrong.example',
        })
      ).rejects.toMatchObject({ code: 'ERR_TLS_CERT_ALTNAME_INVALID' });
      expect(servernames).toEqual(['proof.example', 'wrong.example']);
    } finally {
      controller.abort();
      vi.mocked(request).mockReset();
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  }
);

test('rejects deprecated 6bone reserved IPv6 space', () => {
  expect(isPublicAddress('3ffe::1')).toBe(false);
});

test('body cap counts cumulative UTF8 bytes and closes an overflowing stream', async () => {
  const body = Readable.from(['"é', 'é"']);
  await expect(
    safeFetchJson(
      'https://proof.example',
      {
        resolve: async () => [{ address: '8.8.8.8', family: 4 }],
        request: async () => ({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body,
        }),
      },
      { maxBytes: 5 }
    )
  ).rejects.toThrow('body-limit');
  expect(body.destroyed).toBe(true);
});

test('DNS completion after the deadline cannot initiate a connection', async () => {
  let resolveDns = (
    _addresses: Array<{ address: string; family: number }>
  ) => {};
  const dns = new Promise<Array<{ address: string; family: number }>>(
    (resolve) => {
      resolveDns = resolve;
    }
  );
  const connect = vi.fn();
  await expect(
    safeFetchJson(
      'https://proof.example',
      { resolve: () => dns, request: connect },
      { timeoutMs: 10 }
    )
  ).rejects.toThrow('timeout');
  resolveDns([{ address: '8.8.8.8', family: 4 }]);
  await Promise.resolve();
  expect(connect).not.toHaveBeenCalled();
});

test('deadline remains timeout when abort synchronously rejects the pending request', async () => {
  await expect(
    safeFetchJson(
      'https://proof.example',
      {
        resolve: async () => [{ address: '8.8.8.8', family: 4 }],
        request: (_url, { signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener(
              'abort',
              () => reject(new Error('AbortError')),
              { once: true }
            );
          }),
      },
      { timeoutMs: 10 }
    )
  ).rejects.toThrow('timeout');
});

test('deadline includes hung DNS and a stalled response body', async () => {
  await expect(
    safeFetchJson(
      'https://example.com',
      {
        resolve: () => new Promise(() => {}),
        request: () => new Promise(() => {}),
      },
      { timeoutMs: 10 }
    )
  ).rejects.toThrow('timeout');
  await expect(
    safeFetchJson(
      'https://example.com',
      {
        resolve: async () => [{ address: '8.8.8.8', family: 4 }],
        request: async () => ({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: new Readable({ read() {} }),
        }),
      },
      { timeoutMs: 10 }
    )
  ).rejects.toThrow('timeout');
});
