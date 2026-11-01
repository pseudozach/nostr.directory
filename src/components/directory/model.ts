import { bech32 } from 'bech32';
import { nip19 } from 'nostr-tools';

import type { DirectoryEvent } from '../../identity/events';

export type Claim = {
  platform: string;
  identity: string;
  proof?: unknown;
  state: string;
  checkedAt?: string;
  reason?: string;
};
export type Person = {
  pubkey: string;
  npub: string;
  metadata: {
    name?: string;
    display_name?: string;
    about?: string;
    picture?: string;
  };
  currentEvent: DirectoryEvent | null;
  observedComplete: boolean;
  claims: Claim[];
  legacy: Record<string, unknown>[];
};
export const text = (value: unknown, limit = 2000): string | undefined =>
  typeof value === 'string' ? value.slice(0, limit) : undefined;

export function publicKey(value: string): string | null {
  if (/^[a-f0-9]{64}$/.test(value)) return value;
  try {
    if (value.startsWith('npub1')) {
      const decoded = nip19.decode(value);
      return decoded.type === 'npub' && typeof decoded.data === 'string'
        ? decoded.data
        : null;
    }
    if (!value.startsWith('nprofile1') || value.length > 1024) return null;
    const bytes = bech32.fromWords(bech32.decode(value, 1024).words);
    let key: string | null = null;
    for (let offset = 0; offset < bytes.length; ) {
      const type = bytes[offset];
      const size = bytes[offset + 1];
      offset += 2;
      if (size === undefined || offset + size > bytes.length) return null;
      if (type === 0) {
        if (key || size !== 32) return null;
        key = bytes
          .slice(offset, offset + size)
          .map((byte) => byte.toString(16).padStart(2, '0'))
          .join('');
      }
      offset += size;
    }
    return key;
  } catch {
    return null;
  }
}

export function safeImage(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.+$/, '');
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !host.includes('.') ||
      /[:[\]]/.test(host) ||
      /^\d+(\.\d+){3}$/.test(host) ||
      /(^|\.)(local|localhost|internal|test|invalid|lan|home|onion|home\.arpa|nip\.io|sslip\.io)$/.test(
        host
      )
    )
      return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function normalizePerson(value: unknown): Person {
  const raw = value as Record<string, any>;
  if (
    !raw ||
    typeof raw.pubkey !== 'string' ||
    !/^[a-f0-9]{64}$/.test(raw.pubkey)
  )
    throw new Error('Invalid directory person');
  const metadata =
    raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {};
  return {
    pubkey: raw.pubkey,
    npub: nip19.npubEncode(raw.pubkey),
    metadata: {
      name: text(metadata.name, 200),
      display_name: text(metadata.display_name, 200),
      about: text(metadata.about),
      picture: safeImage(metadata.picture),
    },
    currentEvent: raw.currentEvent ?? null,
    observedComplete: raw.observedComplete === true,
    claims: Array.isArray(raw.claims)
      ? raw.claims
          .filter(
            (claim: any) =>
              claim &&
              typeof claim.platform === 'string' &&
              typeof claim.identity === 'string'
          )
          .map((claim: any) => ({
            platform: text(claim.platform, 100)!,
            identity: text(claim.identity)!,
            proof: claim.proof,
            state: text(claim.state, 100) ?? 'claim',
            checkedAt: text(claim.checkedAt, 100),
            reason: text(claim.reason, 500),
          }))
      : [],
    legacy: Array.isArray(raw.legacy)
      ? raw.legacy.filter(
          (entry: unknown) => entry && typeof entry === 'object'
        )
      : [],
  };
}

export function directoryQuery(
  query: string,
  platform: string,
  state: string,
  cursor?: string
): string {
  if (/nsec1/i.test(query))
    throw new Error('Use only public keys, never a private key.');
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  if (platform) params.set('platform', platform);
  if (state) params.set('state', state);
  if (cursor) params.set('cursor', cursor);
  return params.toString();
}
