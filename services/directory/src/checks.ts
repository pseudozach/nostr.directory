import { createHash } from 'node:crypto';

import {
  CHECKER_VERSION,
  evaluateProof,
  ProofInput,
  ProofResult,
  ProofTransport,
  RETRY_TTL_MS,
} from './proofs';
import { safeFetchJson } from './safe-fetch';

export type BoundProof = ProofInput & { eventId: string; position: number };
export type CheckStorage = {
  get: (key: string) => ProofResult | undefined;
  set: (key: string, result: ProofResult) => void;
};
export type OutboundBudget = { reserve: (now: number) => boolean };
/** Single-process default only. Inject an atomic durable reserve implementation for restart/fleet quotas. */
export function createMemoryBudget(): OutboundBudget {
  let day = -Infinity;
  let used = 0;
  return {
    reserve: (now) => {
      const nextDay = Math.floor(now / 86400000);
      if (nextDay > day) {
        day = nextDay;
        used = 0;
      }
      if (used >= 500) return false;
      used += 1;
      return true;
    },
  };
}
const processBudget = createMemoryBudget();
let active = 0;
const waiting: Array<() => void> = [];
async function acquire(): Promise<() => void> {
  if (active >= 2) {
    if (waiting.length >= 32) throw new Error('queue-full');
    await new Promise<void>((resolve) => {
      waiting.push(resolve);
    });
  } else active += 1;
  return () => {
    const next = waiting.shift();
    if (next) next();
    else active -= 1;
  };
}

export type CheckOptions = {
  /** Required trusted membership test against the latest validated signed event AND exact entry. */
  isCurrent: (input: BoundProof) => boolean;
  transport?: ProofTransport;
  storage?: CheckStorage;
  budget?: OutboundBudget;
};
export function proofDigest(input: ProofInput): string {
  return createHash('sha256')
    .update(JSON.stringify([input.platform, input.identity, input.proof]))
    .digest('hex');
}
export function proofCacheKey(
  input: BoundProof,
  version = CHECKER_VERSION
): string {
  if (
    !/^[a-f0-9]{64}$/.test(input.eventId) ||
    !/^[a-f0-9]{64}$/.test(input.pubkey) ||
    !Number.isSafeInteger(input.position) ||
    input.position < 0 ||
    input.position >= 256
  )
    throw new Error('invalid-event-binding');
  return JSON.stringify([
    input.pubkey,
    input.eventId,
    input.position,
    proofDigest(input),
    version,
  ]);
}

/** Internal cache only. Membership must be rechecked on every use, never inferred from cache. */
export class ProofChecks {
  private storage: CheckStorage;

  private pending = new Map<string, Promise<ProofResult>>();

  constructor(private options: CheckOptions) {
    this.storage = options.storage ?? new Map<string, ProofResult>();
  }

  private unchecked(reason: string): ProofResult {
    const checkedAt = Date.now();
    return {
      state: 'claim',
      reason,
      checkedAt,
      expiresAt: checkedAt + RETRY_TTL_MS,
      checkerVersion: CHECKER_VERSION,
    };
  }

  read(input: BoundProof): ProofResult {
    const key = proofCacheKey(input);
    if (!this.options.isCurrent(input))
      return this.unchecked('removed-or-replaced');
    const result = this.storage.get(key);
    if (!result) return this.unchecked('unchecked');
    return result.expiresAt <= Date.now()
      ? { ...result, state: 'stale', reason: 'expired' }
      : { ...result };
  }

  async check(declaration: BoundProof): Promise<ProofResult> {
    // Bind the cache and every later membership check to the same declaration snapshot.
    const input = { ...declaration };
    const key = proofCacheKey(input);
    if (!this.options.isCurrent(input))
      return this.unchecked('removed-or-replaced');
    const existing = this.storage.get(key);
    if (existing && existing.expiresAt > Date.now()) return { ...existing };
    const pending = this.pending.get(key);
    if (pending) return pending;
    const operation = async () => {
      let release: (() => void) | undefined;
      try {
        release = await acquire();
        if (!this.options.isCurrent(input))
          return this.unchecked('removed-or-replaced');
        const evaluated = await evaluateProof(input, async (url) => {
          if (!this.options.isCurrent(input))
            throw new Error('removed-or-replaced');
          if (!(this.options.budget ?? processBudget).reserve(Date.now()))
            throw new Error('daily-budget');
          return (this.options.transport ?? safeFetchJson)(url);
        });
        const lastSuccessAt =
          evaluated.state === 'verified'
            ? evaluated.checkedAt
            : existing?.lastSuccessAt;
        const result = {
          ...evaluated,
          ...(lastSuccessAt !== undefined ? { lastSuccessAt } : {}),
        };
        this.storage.set(key, { ...result });
        return this.options.isCurrent(input)
          ? result
          : this.unchecked('removed-or-replaced');
      } catch {
        return {
          ...this.unchecked('queue-unavailable'),
          state: existing ? ('stale' as const) : ('not-checkable' as const),
          ...(existing?.lastSuccessAt !== undefined
            ? { lastSuccessAt: existing.lastSuccessAt }
            : {}),
        };
      } finally {
        release?.();
        this.pending.delete(key);
      }
    };
    const promise = operation();
    this.pending.set(key, promise);
    return promise;
  }
}
