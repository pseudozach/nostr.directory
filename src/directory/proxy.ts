import { bech32 } from 'bech32';
import { nip19 } from 'nostr-tools';

export type DirectoryResponse = { status: number; body: unknown };

export async function readDirectory(
  origin: string | undefined,
  query: Record<string, unknown>,
  transport: typeof fetch = fetch
): Promise<DirectoryResponse> {
  if (!origin)
    return {
      status: 503,
      body: { error: 'directory unavailable', stale: true },
    };
  const valid = Object.entries(query).every(([key, value]) => {
    if (typeof value !== 'string') return false;
    if (key === 'q')
      return (
        value.length <= 120 &&
        !Array.from(value).some(
          (character) =>
            character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
        ) &&
        !/nsec1/i.test(value)
      );
    if (key === 'platform') return /^[a-z0-9_-]{1,64}$/.test(value);
    if (key === 'state')
      return ['verified', 'claim', 'not-checkable', 'stale', 'legacy'].includes(
        value
      );
    if (key === 'cursor') return /^[a-zA-Z0-9_-]{1,256}$/.test(value);
    return false;
  });
  if (!valid)
    return { status: 400, body: { error: 'invalid directory query' } };
  // eslint-disable-next-line @typescript-eslint/no-use-before-define -- Function declaration is hoisted.
  return readEndpoint(origin, '/api/directory', query, transport);
}

export async function readPerson(
  origin: string | undefined,
  identifier: unknown,
  transport: typeof fetch = fetch
): Promise<DirectoryResponse> {
  let pubkey = identifier;
  if (
    typeof identifier === 'string' &&
    identifier.length <= 1024 &&
    /^(npub1|nprofile1)/.test(identifier)
  ) {
    try {
      if (identifier.startsWith('nprofile1')) {
        // Old SDK assumes relay-hint TLV 1 exists. Read only the public key;
        // hints are optional and never influence the fixed service destination.
        const decoded = bech32.decode(identifier, 1024);
        const bytes = bech32.fromWords(decoded.words);
        pubkey = null;
        for (let offset = 0; offset < bytes.length; ) {
          if (offset + 2 > bytes.length)
            throw new Error('truncated profile TLV');
          const type = bytes[offset];
          const length = bytes[offset + 1]!;
          offset += 2;
          if (offset + length > bytes.length)
            throw new Error('truncated profile value');
          if (type === 0) {
            if (length !== 32 || pubkey !== null)
              throw new Error('invalid profile key');
            pubkey = Buffer.from(bytes.slice(offset, offset + length)).toString(
              'hex'
            );
          }
          offset += length;
        }
      } else {
        const decoded = nip19.decode(identifier);
        pubkey = decoded.type === 'npub' ? decoded.data : null;
      }
    } catch {
      pubkey = null;
    }
  }
  if (typeof pubkey !== 'string' || !/^[a-f0-9]{64}$/.test(pubkey)) {
    return { status: 400, body: { error: 'invalid public identifier' } };
  }
  // eslint-disable-next-line @typescript-eslint/no-use-before-define -- Function declaration is hoisted.
  return readEndpoint(origin, `/api/directory/${pubkey}`, {}, transport);
}

async function readEndpoint(
  origin: string | undefined,
  path: string,
  query: Record<string, unknown>,
  transport: typeof fetch
): Promise<DirectoryResponse> {
  if (!origin)
    return {
      status: 503,
      body: { error: 'directory unavailable', stale: true },
    };
  let base: URL;
  try {
    base = new URL(origin);
    if (
      base.username ||
      base.password ||
      base.pathname !== '/' ||
      base.search ||
      base.hash ||
      (base.protocol !== 'https:' &&
        !(
          base.protocol === 'http:' &&
          ['127.0.0.1', '[::1]'].includes(base.hostname)
        ))
    )
      throw new Error('invalid service origin');
  } catch {
    return {
      status: 503,
      body: { error: 'directory unavailable', stale: true },
    };
  }
  const url = new URL(path, base);
  Object.entries(query).forEach(([key, value]) =>
    url.searchParams.set(key, String(value))
  );
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reader?.cancel().catch(() => {});
      reject(new Error('directory deadline exceeded'));
    }, 3000);
  });
  try {
    const operation = async (): Promise<DirectoryResponse> => {
      const response = await transport(url, {
        redirect: 'error',
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (controller.signal.aborted) {
        response.body?.cancel().catch(() => {});
        throw new Error('directory deadline exceeded');
      }
      if (
        response.status !== 200 ||
        response.redirected ||
        response.headers
          .get('content-type')
          ?.split(';')[0]
          ?.trim()
          .toLowerCase() !== 'application/json'
      ) {
        await response.body?.cancel();
        throw new Error('invalid service response');
      }
      if (!response.body) throw new Error('missing service body');
      reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          // eslint-disable-next-line no-await-in-loop -- Bounded stream reads are sequential and raced against one deadline.
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 1024 * 1024) throw new Error('service body too large');
          chunks.push(value);
        }
      } finally {
        reader.cancel().catch(() => {});
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      chunks.forEach((chunk) => {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      });
      return {
        status: 200,
        body: JSON.parse(
          new TextDecoder('utf-8', { fatal: true }).decode(bytes)
        ),
      };
    };
    return await Promise.race([operation(), deadline]);
  } catch {
    return {
      status: 502,
      body: { error: 'directory unavailable', stale: true },
    };
  } finally {
    clearTimeout(timer);
  }
}
