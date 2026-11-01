import { ProofChecks } from './checks';
import type { BoundProof } from './checks';
import type { ProofTransport } from './proofs';
import { productionNetwork, safeFetchJson } from './safe-fetch';
import type { SafeNetwork } from './safe-fetch';
import type { DirectoryStore } from './store';

type Options = {
  transport?: ProofTransport;
  network?: SafeNetwork;
  batchSize?: number;
  intervalMs?: number;
};

/** Finite, rotating batches of exact current declarations; construction is inert. */
export class ProofWorker {
  readonly checks: ProofChecks;

  private batchSize: number;

  private cursor = '';

  private running?: Promise<void>;

  private stopped = false;

  private controller = new AbortController();

  private timer?: ReturnType<typeof setTimeout>;

  private started = false;

  private intervalMs: number;

  /** Stop waiting on DNS/fixtures as well as aborting native HTTPS sockets. */
  private abortable<T>(operation: Promise<T>): Promise<T> {
    const { signal } = this.controller;
    if (signal.aborted)
      return Promise.reject(new Error('proof worker stopped'));
    return new Promise<T>((resolve, reject) => {
      const abort = () => {
        signal.removeEventListener('abort', abort);
        reject(new Error('proof worker stopped'));
      };
      signal.addEventListener('abort', abort, { once: true });
      operation
        .then(resolve, reject)
        .finally(() => signal.removeEventListener('abort', abort));
    });
  }

  constructor(private store: DirectoryStore, options: Options = {}) {
    this.intervalMs = options.intervalMs ?? 60000;
    if (
      !Number.isInteger(this.intervalMs) ||
      this.intervalMs < 1000 ||
      this.intervalMs > 86400000
    )
      throw new Error('invalid proof interval');
    this.batchSize = options.batchSize ?? 20;
    if (
      !Number.isInteger(this.batchSize) ||
      this.batchSize < 1 ||
      this.batchSize > 100
    )
      throw new Error('invalid proof batch size');
    const network = options.network ?? productionNetwork;
    const transport =
      options.transport ??
      ((url: string) =>
        safeFetchJson(url, {
          resolve: (hostname) => this.abortable(network.resolve(hostname)),
          request: (target, request) => {
            this.controller.signal.throwIfAborted();
            return network.request(target, {
              ...request,
              signal: AbortSignal.any([request.signal, this.controller.signal]),
            });
          },
        }));
    const storage = store.checkStorage();
    const budget = store.outboundBudget();
    this.checks = new ProofChecks({
      isCurrent: (input) => !this.stopped && store.isCurrentProof(input),
      storage: {
        get: storage.get,
        set: (key, result) => {
          if (!this.stopped) storage.set(key, result);
        },
      },
      budget: { reserve: (now) => !this.stopped && budget.reserve(now) },
      transport: (url) => {
        this.controller.signal.throwIfAborted();
        return this.abortable(transport(url));
      },
    });
  }

  private batch(): BoundProof[] {
    const batch: BoundProof[] = [];
    // Explicit loops let the finite batch stop without materializing every claim.
    // eslint-disable-next-line no-restricted-syntax
    for (const pubkey of this.store.roster()) {
      // eslint-disable-next-line no-restricted-syntax
      for (const claim of this.store.claims(pubkey)) {
        const cursor = `${pubkey}:${String(claim.position).padStart(3, '0')}`;
        // eslint-disable-next-line no-continue
        if (cursor <= this.cursor) continue;
        const tag = JSON.parse(claim.raw_tag_json) as unknown[];
        batch.push({
          pubkey,
          eventId: claim.event_id,
          position: claim.position,
          platform: claim.platform,
          identity: claim.identity,
          proof: tag[2],
        });
        if (batch.length === this.batchSize) {
          this.cursor = cursor;
          return batch;
        }
      }
    }
    this.cursor = '';
    return batch;
  }

  async tick(): Promise<void> {
    if (this.running || this.stopped) return;
    const batch = this.batch();
    let next = 0;
    const consume = async () => {
      while (!this.stopped && next < batch.length) {
        const input = batch[next]!;
        next += 1;
        // Sequential consumers deliberately cap concurrency at two.
        // eslint-disable-next-line no-await-in-loop
        await this.checks.check(input);
      }
    };
    this.running = Promise.all([consume(), consume()]).then(() => {});
    try {
      await this.running;
    } finally {
      this.running = undefined;
    }
  }

  start(): void {
    if (this.started || this.stopped) return;
    this.started = true;
    const cycle = async () => {
      await this.tick().catch(() => {});
      if (!this.stopped) this.timer = setTimeout(cycle, this.intervalMs);
    };
    cycle();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    clearTimeout(this.timer);
    this.controller.abort();
    await this.running;
  }
}
