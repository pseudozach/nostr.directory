import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';

export type Address = { address: string; family: number };
export type SafeResponse = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: AsyncIterable<Uint8Array | string>;
};
export type PinnedRequest = Address & {
  servername: string;
  signal: AbortSignal;
};
export type SafeNetwork = {
  resolve: (hostname: string) => Promise<Address[]>;
  request: (url: URL, options: PinnedRequest) => Promise<SafeResponse>;
};

/** Conservative global unicast allowlist; reject mapped, translation and special IPv6. */
export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a = 0, b = 0, c = 0] = address.split('.').map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 &&
        (b === 168 || b === 0 || (b === 88 && c === 99) || b === 2)) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (isIP(address) !== 6 || address.includes('.') || address.includes('%'))
    return false;
  const first = parseInt(address.split(':')[0] || '0', 16);
  // Only 2000::/3, excluding IETF special-purpose 2001::/23, documentation, 6to4.
  const second = parseInt(address.split(':')[1] || '0', 16);
  return (
    first >= 0x2000 &&
    first <= 0x3fff &&
    !(first === 0x2001 && (second <= 0x1ff || second === 0xdb8)) &&
    first !== 0x2002 &&
    first !== 0x3ffe &&
    !(first === 0x3fff && second <= 0xfff)
  );
}

export const productionNetwork: SafeNetwork = {
  resolve: (hostname) => lookup(hostname, { all: true, verbatim: true }),
  request: (url, options) =>
    new Promise((resolve, reject) => {
      const req = request(
        url,
        {
          method: 'GET',
          agent: false,
          servername: options.servername,
          signal: options.signal,
          // No second DNS resolution: this exact vetted address is used for this socket.
          lookup: (_hostname, lookupOptions, callback) => {
            if (typeof lookupOptions === 'object' && lookupOptions.all) {
              callback(null, [
                { address: options.address, family: options.family },
              ]);
            } else callback(null, options.address, options.family);
          },
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'identity',
            'User-Agent': 'nostr.directory-proof-checker/2',
          },
        },
        (response) =>
          resolve({
            status: response.statusCode || 0,
            headers: response.headers,
            body: response,
          })
      );
      req.on('error', reject);
      req.end();
    }),
};

export type FetchLimits = { timeoutMs?: number; maxBytes?: number };
/** Internal service utility, never expose as an arbitrary URL proxy. Redirects/compression rejected. */
export async function safeFetchJson(
  urlString: string,
  network: SafeNetwork = productionNetwork,
  limits: FetchLimits = {}
): Promise<unknown> {
  const url = new URL(urlString);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443') ||
    url.hash ||
    isIP(url.hostname) ||
    url.hostname.includes(':')
  )
    throw new Error('blocked-url');
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('timeout'));
    }, limits.timeoutMs ?? 5000);
  });
  const operation = async () => {
    const addresses = await network.resolve(url.hostname);
    if (
      !addresses.length ||
      addresses.some(
        (entry) =>
          !isPublicAddress(entry.address) ||
          isIP(entry.address) !== entry.family
      )
    )
      throw new Error('blocked-address');
    if (controller.signal.aborted) throw new Error('timeout');
    const address = addresses[0]!;
    const response = await network.request(url, {
      ...address,
      servername: url.hostname,
      signal: controller.signal,
    });
    if (controller.signal.aborted) throw new Error('timeout');
    if (response.status < 200 || response.status >= 300)
      throw new Error(`http-${response.status}`);
    const encoding = response.headers['content-encoding'];
    if (encoding && encoding !== 'identity')
      throw new Error('compressed-response');
    if (
      !/^application\/(?:[a-z0-9.+-]+\+)?json(?:\s*;|$)/i.test(
        String(response.headers['content-type'])
      )
    )
      throw new Error('not-json');
    const max = limits.maxBytes ?? 262144;
    if (Number(response.headers['content-length']) > max)
      throw new Error('body-limit');
    let size = 0;
    const chunks: Buffer[] = [];
    // Native Node22 async iteration applies backpressure and closes the stream on overflow.
    // eslint-disable-next-line no-restricted-syntax
    for await (const chunk of response.body) {
      const bytes = Buffer.from(chunk);
      size += bytes.length;
      if (size > max) throw new Error('body-limit');
      chunks.push(bytes);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  };
  try {
    return await Promise.race([operation(), deadline]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
