import { validateDirectoryEvent } from '../../../src/identity/events';
import type { DirectoryStore } from './store';

export class PolicyError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** In-process token buckets, capped key cardinality, no unbounded IP/author map. */
export class RateLimiter {
  private buckets = new Map<string, {tokens: number; at: number}>();
  constructor(private capacity = 30, private perSecond = 10, private maxKeys = 20000, private now = Date.now) {}
  take(key: string): void {
    const at = this.now();
    if (!this.buckets.has(key) && this.buckets.size >= this.maxKeys) {
      for (const [k, bucket] of this.buckets) if (at - bucket.at > 60000) this.buckets.delete(k);
      if (this.buckets.size >= this.maxKeys) throw new PolicyError('rate capacity', 429);
    }
    const old = this.buckets.get(key) ?? {tokens: this.capacity, at};
    const tokens = Math.min(this.capacity, old.tokens + Math.max(0, at - old.at) / 1000 * this.perSecond);
    if (tokens < 1) throw new PolicyError('rate limited', 429);
    this.buckets.set(key, {tokens: tokens - 1, at});
  }
}

export class AdmissionPolicy {
  private global = new RateLimiter(30, 10);
  private ips = new RateLimiter(10, 1);
  private authors = new RateLimiter(6, 0.1);
  readonly maxAuthors: number;
  constructor(private store: DirectoryStore, options: {maxAuthors?: number} = {}) {
    this.maxAuthors = Math.min(10000, Math.max(1, options.maxAuthors ?? 10000));
    this.store.limitAuthors(this.maxAuthors);
  }
  admit(value: unknown, source: string): void {
    if (!validateDirectoryEvent(value) || value.created_at > Math.floor(Date.now()/1000) + 600) throw new PolicyError('invalid event');
    this.store.checkAuthorCapacity(value.pubkey);
    this.global.take('global'); this.ips.take(source); this.authors.take(value.pubkey);
  }
}
