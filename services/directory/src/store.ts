import { readFileSync } from 'fs';
import { join } from 'path';
import { latest, validateDirectoryEvent } from '../../../src/identity/events';
import type { DirectoryEvent } from '../../../src/identity/events';
import type { BoundProof, CheckStorage } from './checks';
import { PolicyError } from './policy';

type Value = string | number | null;
interface Statement {
  run(...values: Value[]): unknown;
  all(...values: Value[]): unknown[];
  get(...values: Value[]): unknown;
}
interface Database {
  exec(sql: string): void;
  prepare(sql: string): Statement;
  close(): void;
}
// Node 22.13+ supplies SQLite without host packages or a native-addon build.
const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (path: string) => Database };

export type Claim = {
  pubkey: string; event_id: string; position: number;
  platform: string; identity: string; raw_tag_json: string;
};

export type Checkpoint = { source: string; filterHash: string; watermark: number };

export class DirectoryStore {
  private db: Database;
  private maxAuthors = 10000;
  private pendingAuthors = new Map<string, number>();

  // All policies and ingestion paths on this store share one bounded capacity pool.
  // A later default policy must not relax an explicitly configured cap.
  limitAuthors(limit: number): void { this.maxAuthors = Math.min(this.maxAuthors, limit); }

  checkAuthorCapacity(pubkey: string): void {
    if (this.has(pubkey)) return;
    const occupied = new Set([...this.roster(true), ...this.pendingAuthors.keys()]);
    const capacity = occupied.has(pubkey) ? occupied.size > this.maxAuthors : occupied.size >= this.maxAuthors;
    if (capacity) throw new PolicyError('corpus full', 429);
  }

  reserveAuthor(pubkey: string): () => void {
    this.checkAuthorCapacity(pubkey);
    if (this.has(pubkey)) return () => {};
    this.pendingAuthors.set(pubkey, (this.pendingAuthors.get(pubkey) ?? 0) + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const remaining = this.pendingAuthors.get(pubkey)! - 1;
      if (remaining) this.pendingAuthors.set(pubkey, remaining);
      else this.pendingAuthors.delete(pubkey);
    };
  }

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(readFileSync(join(__dirname, '../schema.sql'), 'utf8'));
  }

  apply(event: DirectoryEvent, checkpoint?: Checkpoint): void {
    if (!validateDirectoryEvent(event)) throw new Error('invalid directory event');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.checkAuthorCapacity(event.pubkey);
      const current = this.db.prepare('SELECT id, created_at FROM current_events WHERE pubkey = ? AND kind = ?')
        .get(event.pubkey, event.kind) as { id: string; created_at: number } | undefined;
      if (!current || latest(current, event).id !== current.id) {
        this.db.prepare('INSERT OR REPLACE INTO current_events VALUES (?, ?, ?, ?)')
          .run(event.pubkey, event.kind, event.id, event.created_at);
        let payload: unknown = event;
        if (event.kind === 0) {
          const metadata: Record<string, string> = {};
          try {
            const input = JSON.parse(event.content);
            for (const key of ['name', 'display_name', 'about', 'picture']) {
              if (typeof input?.[key] === 'string') metadata[key] = input[key].slice(0, key === 'about' ? 2000 : 500);
            }
          } catch { /* malformed metadata is not authoritative profile text */ }
          payload = metadata;
        }
        this.db.prepare('INSERT OR REPLACE INTO current_payloads VALUES (?, ?, ?)').run(event.pubkey, event.kind, JSON.stringify(payload));
        if (event.kind === 10011) {
          this.db.prepare('DELETE FROM identities WHERE pubkey = ?').run(event.pubkey);
          const insert = this.db.prepare('INSERT OR REPLACE INTO identities VALUES (?, ?, ?, ?, ?, ?)');
          event.tags.forEach((tag, position) => {
            if (tag[0] !== 'i' || !tag[1]?.includes(':')) return;
            const colon = tag[1].indexOf(':');
            insert.run(event.pubkey, event.id, position, tag[1].slice(0, colon), tag[1].slice(colon + 1), JSON.stringify(tag));
          });
        }
      }
      if (checkpoint) {
        this.db.prepare('INSERT INTO checkpoints VALUES (?, ?, ?) ON CONFLICT(source, filter_hash) DO UPDATE SET watermark = MAX(checkpoints.watermark, excluded.watermark)')
          .run(checkpoint.source, checkpoint.filterHash, checkpoint.watermark);
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  claims(pubkey: string): Claim[] {
    if (this.db.prepare('SELECT 1 FROM suppression WHERE pubkey = ?').get(pubkey)) return [];
    return this.db.prepare('SELECT * FROM identities WHERE pubkey = ? ORDER BY position').all(pubkey) as Claim[];
  }

  suppress(pubkey: string, reason: string): void {
    this.db.prepare('INSERT OR REPLACE INTO suppression VALUES (?, ?)').run(pubkey, reason);
  }

  checkpoint(source: string, filterHash: string): number | null {
    const row = this.db.prepare('SELECT watermark FROM checkpoints WHERE source = ? AND filter_hash = ?')
      .get(source, filterHash) as { watermark: number } | undefined;
    return row?.watermark ?? null;
  }

  lookup(platform: string, identity: string, limit = 20): Claim[] {
    if (typeof platform !== 'string' || platform.length < 1 || platform.length > 64
      || typeof identity !== 'string' || identity.length < 1 || identity.length > 300
      || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('invalid lookup');
    const sql = platform === 'github'
      ? 'SELECT * FROM identities WHERE platform = ? AND identity = ? COLLATE NOCASE AND NOT EXISTS (SELECT 1 FROM suppression WHERE suppression.pubkey = identities.pubkey) ORDER BY pubkey, position LIMIT ?'
      : 'SELECT * FROM identities WHERE platform = ? AND identity = ? AND NOT EXISTS (SELECT 1 FROM suppression WHERE suppression.pubkey = identities.pubkey) ORDER BY pubkey, position LIMIT ?';
    return this.db.prepare(sql).all(platform, identity, limit) as Claim[];
  }

  identityMatches(prefix: string, platform?: string): string[] {
    const sql = `SELECT DISTINCT i.pubkey FROM identities i WHERE ${platform ? 'i.platform = ? AND ' : ''} ((i.platform = 'github' AND i.identity >= ? COLLATE NOCASE AND i.identity < ? COLLATE NOCASE) OR (i.platform <> 'github' AND i.identity >= ? AND i.identity < ?)) AND NOT EXISTS (SELECT 1 FROM suppression s WHERE s.pubkey = i.pubkey) ORDER BY i.pubkey LIMIT 10000`;
    const values = [prefix, prefix + '\uffff', prefix, prefix + '\uffff'];
    return (this.db.prepare(sql).all(...(platform ? [platform, ...values] : values)) as {pubkey:string}[]).map(r => r.pubkey);
  }

  roster(includeSuppressed = false): string[] {
    return (this.db.prepare(`SELECT DISTINCT pubkey FROM current_events ${includeSuppressed ? '' : 'WHERE NOT EXISTS (SELECT 1 FROM suppression s WHERE s.pubkey = current_events.pubkey)'} ORDER BY pubkey`).all() as {pubkey: string}[]).map((r) => r.pubkey);
  }

  has(pubkey: string): boolean { return !!this.db.prepare('SELECT 1 FROM current_events WHERE pubkey = ? LIMIT 1').get(pubkey); }
  suppressed(pubkey: string): boolean { return !!this.db.prepare('SELECT 1 FROM suppression WHERE pubkey = ?').get(pubkey); }

  private payload(pubkey: string, kind: number): unknown {
    const row = this.db.prepare('SELECT payload FROM current_payloads WHERE pubkey = ? AND kind = ?').get(pubkey, kind) as {payload: string} | undefined;
    return row ? JSON.parse(row.payload) : null;
  }

  current(pubkey: string, kind: number): DirectoryEvent | null {
    return kind === 10011 ? this.payload(pubkey, kind) as DirectoryEvent | null : null;
  }

  metadata(pubkey: string): Record<string, string> { return this.payload(pubkey, 0) as Record<string, string> ?? {}; }
  state(key: string): unknown {
    const row = this.db.prepare('SELECT value FROM service_state WHERE key = ?').get(key) as {value: string} | undefined;
    return row ? JSON.parse(row.value) : null;
  }
  setState(key: string, value: unknown): void {
    this.db.prepare('INSERT OR REPLACE INTO service_state VALUES (?, ?)').run(key, JSON.stringify(value));
  }

  isCurrentProof(input: BoundProof): boolean {
    if (this.suppressed(input.pubkey)) return false;
    const event = this.current(input.pubkey, 10011);
    if (!event || event.id !== input.eventId || !Number.isSafeInteger(input.position) || input.position < 0) return false;
    const tag = event.tags[input.position];
    return !!tag && tag[0] === 'i' && tag[1] === `${input.platform}:${input.identity}`
      && JSON.stringify(tag[2]) === JSON.stringify(input.proof);
  }

  checkStorage(): CheckStorage {
    return {
      get: (key) => {
        const row = this.db.prepare('SELECT result FROM proof_cache WHERE key = ?').get(key) as { result: string } | undefined;
        return row ? JSON.parse(row.result) : undefined;
      },
      set: (key, result) => { this.db.prepare('INSERT OR REPLACE INTO proof_cache VALUES (?, ?)').run(key, JSON.stringify(result)); },
    };
  }

  outboundBudget(): import('./checks').OutboundBudget {
    return { reserve: (now) => {
      if (!Number.isSafeInteger(now) || now < 0) return false;
      const day = Math.floor(now / 86400000);
      // Serialize readers/writers across connections and processes before checking the quota.
      this.db.exec('BEGIN IMMEDIATE');
      try {
        const previous = this.db.prepare('SELECT day, used FROM outbound_budget WHERE singleton = 1').get() as {day:number;used:number} | undefined;
        const allowed = !previous || day > previous.day || (day === previous.day && previous.used < 500);
        if (allowed) this.db.prepare('INSERT OR REPLACE INTO outbound_budget VALUES (1, ?, ?)').run(day, previous?.day === day ? previous.used + 1 : 1);
        this.db.exec('COMMIT');
        return allowed;
      } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    } };
  }

  close(): void { this.db.close(); }
}
