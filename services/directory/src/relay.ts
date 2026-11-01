import WebSocket from 'ws';
import { randomUUID } from 'crypto';
import { latest, validateDirectoryEvent } from '../../../src/identity/events';
import type { DirectoryEvent } from '../../../src/identity/events';
import type { DirectoryRelay } from './ingest';

export type RelayFilter = { kinds: number[]; authors?: string[]; ids?: string[]; search?: string; since?: number; until?: number; limit: number };
export interface QueryRelay extends DirectoryRelay { query(filter: RelayFilter, signal?: AbortSignal): Promise<DirectoryEvent[]>; close(): void; }
type Pending = { message: (m: unknown[]) => void; fail: (error: Error) => void };

/** Lazy, persistent bounded transport. Disconnects fail operations; subsequent requests reconnect. */
export class DittoRelay implements QueryRelay {
  private socket?: WebSocket;
  private connecting?: Promise<void>;
  private pending = new Map<string, Pending>();
  private active = 0;
  private stopped = false;
  constructor(readonly url: string, private timeoutMs = 2500, private maxPending = 24) {
    const parsed = new URL(url);
    if (!['ws:', 'wss:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('invalid relay URL');
  }
  private async connect(): Promise<void> {
    if (this.stopped) throw new Error('relay closed');
    if (this.socket?.readyState === WebSocket.OPEN) return;
    if (this.connecting) return this.connecting;
    this.connecting = new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.url, {maxPayload: 65536, handshakeTimeout: this.timeoutMs, perMessageDeflate: false});
      this.socket = ws;
      const timer = setTimeout(() => { ws.terminate(); reject(new Error('relay connect timeout')); }, this.timeoutMs);
      ws.once('open', () => { clearTimeout(timer); resolve(); });
      ws.on('error', () => { clearTimeout(timer); reject(new Error('relay unavailable')); this.failAll(new Error('relay unavailable')); });
      ws.on('close', () => { clearTimeout(timer); reject(new Error('relay disconnected')); this.failAll(new Error('relay disconnected')); });
      ws.on('message', raw => {
        let m: unknown; try { m = JSON.parse(raw.toString()); } catch { return; }
        if (!Array.isArray(m) || typeof m[1] !== 'string') return;
        this.pending.get(m[1])?.message(m);
      });
    });
    try { await this.connecting; } finally { this.connecting = undefined; }
  }
  private failAll(error: Error): void { for (const p of [...this.pending.values()]) p.fail(error); }
  private async operation<T>(key: string, signal: AbortSignal | undefined, start: (resolve: (v:T) => void, reject: (e:Error) => void) => (m:unknown[]) => void, closeSubscription = false): Promise<T> {
    if (this.active >= this.maxPending) throw new Error('relay busy');
    this.active++;
    try {
      if (signal?.aborted) throw new Error('relay aborted');
      await this.connect();
      if (signal?.aborted) throw new Error('relay aborted');
      if (this.pending.has(key)) throw new Error('relay duplicate pending event');
      return await new Promise<T>((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timer); signal?.removeEventListener('abort', abort); this.pending.delete(key);
          if (closeSubscription && this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(['CLOSE', key]));
        };
        const done = (value: T) => { cleanup(); resolve(value); };
        const fail = (error: Error) => { cleanup(); reject(error); };
        const abort = () => fail(new Error('relay aborted'));
        const timer = setTimeout(() => fail(new Error('relay timeout')), this.timeoutMs);
        signal?.addEventListener('abort', abort, {once:true});
        this.pending.set(key, {message: () => {}, fail});
        try { this.pending.get(key)!.message = start(done, fail); } catch { fail(new Error('relay send failed')); }
      });
    } finally { this.active--; }
  }
  async publish(event: DirectoryEvent, signal: AbortSignal): Promise<{id:string;accepted:boolean}> {
    if (!validateDirectoryEvent(event)) throw new Error('invalid directory event');
    return this.operation(event.id, signal, (resolve) => {
      this.socket!.send(JSON.stringify(['EVENT', event]));
      return m => { if (m[0] === 'OK' && typeof m[2] === 'boolean') resolve({id:event.id, accepted:m[2]}); };
    });
  }
  async query(filter: RelayFilter, signal?: AbortSignal): Promise<DirectoryEvent[]> {
    if (!Number.isInteger(filter.limit) || filter.limit < 1 || filter.limit > 500 || !filter.kinds.length
      || filter.kinds.some(k => k !== 0 && k !== 10011) || (filter.authors && (!filter.authors.length || filter.authors.length > 100 || filter.authors.some(a => !/^[a-f0-9]{64}$/.test(a))))) throw new Error('invalid relay filter');
    const id = randomUUID();
    return this.operation(id, signal, (resolve, reject) => {
      const events = new Map<string, DirectoryEvent>(); let bytes = 0;
      this.socket!.send(JSON.stringify(['REQ', id, filter]));
      return m => {
        if (m[0] === 'CLOSED') { reject(new Error('relay subscription closed')); return; }
        if (m[0] === 'EOSE') { resolve([...events.values()]); return; }
        if (m[0] !== 'EVENT' || !validateDirectoryEvent(m[2])) return;
        const e = m[2];
        if (!filter.kinds.includes(e.kind) || (filter.authors && !filter.authors.includes(e.pubkey))
          || (filter.ids && !filter.ids.includes(e.id)) || (filter.since !== undefined && e.created_at < filter.since)
          || (filter.until !== undefined && e.created_at > filter.until)) return;
        if (events.has(e.id)) return;
        bytes += Buffer.byteLength(JSON.stringify(e));
        if (events.size >= filter.limit || bytes > 8*1024*1024) { reject(new Error('relay result overflow')); return; }
        events.set(e.id, e);
      };
    }, true);
  }
  async current(pubkey: string, kind: number, signal: AbortSignal): Promise<DirectoryEvent | null> {
    const events = await this.query({authors:[pubkey], kinds:[kind], limit:5}, signal);
    return events.reduce<DirectoryEvent | null>((a,b) => latest(a,b), null);
  }
  close(): void { this.stopped = true; this.failAll(new Error('relay closed')); this.socket?.terminate(); }
}
