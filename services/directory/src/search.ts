import { createHash } from 'crypto';
import { nip19 } from 'nostr-tools';
import type { DirectoryEvent } from '../../../src/identity/events';
import type { DirectoryStore } from './store';
import type { QueryRelay } from './relay';
import { PolicyError } from './policy';
import { ProofChecks } from './checks';

export type Person = {
  pubkey: string; npub: string; metadata: Record<string,string>;
  currentEvent: DirectoryEvent | null; observedComplete: boolean;
  claims: {platform:string;identity:string;proof?:unknown;state:string;checkedAt?:string;expiresAt?:string;lastSuccessAt?:string;checkerVersion?:string;reason?:string}[];
  legacy: unknown[];
};
export type SearchArgs = {q?:string;platform?:string;state?:string;cursor?:string};
export function validateQuery(args: Record<string, unknown>): asserts args is SearchArgs {
  for (const [k,v] of Object.entries(args)) {
    if (typeof v !== 'string' || !(k === 'q' ? v.length <= 120 && !/[\x00-\x1f\x7f]/.test(v) && !/nsec1/i.test(v)
      : k === 'platform' ? /^[a-z0-9_-]{1,64}$/.test(v)
      : k === 'state' ? ['verified','claim','not-checkable','stale','legacy'].includes(v)
      : k === 'cursor' ? /^[a-zA-Z0-9_-]{1,256}$/.test(v) : false)) throw new PolicyError('invalid directory query');
  }
}
export function publicKey(input: string): string {
  if (/^[a-f0-9]{64}$/.test(input)) return input;
  try { const decoded = nip19.decode(input); if (decoded.type === 'npub' && typeof decoded.data === 'string') return decoded.data; } catch { /* invalid key */ }
  throw new PolicyError('invalid public identifier');
}
export class DirectorySearch {
  private checks: ProofChecks;
  constructor(private store: DirectoryStore, private relay: Pick<QueryRelay,'query'>) {
    this.checks = new ProofChecks({ isCurrent: input => store.isCurrentProof(input), storage: store.checkStorage(), budget: store.outboundBudget() });
  }
  person(pubkey: string, observedComplete = false): Person {
    const currentEvent = this.store.current(pubkey,10011);
    return {pubkey, npub:nip19.npubEncode(pubkey), metadata:this.store.metadata(pubkey), currentEvent, observedComplete,
      claims:this.store.claims(pubkey).map(c => {
        const tag = JSON.parse(c.raw_tag_json);
        const supported = ['github','bluesky','mastodon'].includes(c.platform);
        const result = this.checks.read({pubkey, eventId:c.event_id, position:c.position, platform:c.platform, identity:c.identity, proof:tag[2]});
        const unchecked = result.reason === 'unchecked';
        return {platform:c.platform,identity:c.identity,...(tag.length > 2 ? {proof:tag[2]} : {}),
          state:unchecked ? (supported ? 'claim':'not-checkable') : result.state,
          reason:result.reason,
          ...(!unchecked ? {checkedAt:new Date(result.checkedAt).toISOString(), expiresAt:new Date(result.expiresAt).toISOString(), checkerVersion:result.checkerVersion} : {}),
          ...(result.lastSuccessAt !== undefined ? {lastSuccessAt:new Date(result.lastSuccessAt).toISOString()} : {})};
      }), legacy:[]};
  }
  async list(args: SearchArgs) {
    validateQuery(args);
    const q = args.q?.trim() ?? '';
    const binding = createHash('sha256').update(JSON.stringify([q,args.platform ?? '',args.state ?? ''])).digest('hex').slice(0,16);
    let after = '';
    if (args.cursor) {
      try {
        const data = JSON.parse(Buffer.from(args.cursor,'base64url').toString('utf8'));
        if (data.v !== 1 || data.b !== binding || !/^[a-f0-9]{64}$/.test(data.after)) throw new Error();
        after = data.after;
      } catch { throw new PolicyError('invalid cursor'); }
    }
    let keys: string[]; let nativeTruncated = false;
    if (!q) keys = this.store.roster();
    else if (/^(npub1|[a-f0-9]{64}$)/.test(q)) { const key=publicKey(q); keys=this.store.has(key) ? [key] : []; }
    else {
      const hits = await this.relay.query({kinds:[0],search:q,limit:500});
      nativeTruncated = hits.length === 500;
      const colon=q.indexOf(':');
      const platform=colon > 0 ? q.slice(0,colon) : args.platform;
      const identity=colon > 0 ? q.slice(colon+1) : q;
      keys = [...hits.filter(e => e.kind === 0 && this.store.has(e.pubkey)).map(e=>e.pubkey), ...this.store.identityMatches(identity,platform)];
    }
    const people = [...new Set(keys)].sort().filter(key => key > after && !this.store.suppressed(key))
      .map(key=>this.person(key)).filter(p => (!args.platform || p.claims.some(c=>c.platform===args.platform))
        && (!args.state || p.claims.some(c=>c.state===args.state && (!args.platform || c.platform===args.platform))));
    const items = people.slice(0,20);
    const nextCursor = people.length > 20 ? Buffer.from(JSON.stringify({v:1,b:binding,after:items[19]!.pubkey})).toString('base64url') : null;
    const coverage = this.store.state('coverage') as Record<string,unknown> | null;
    const last = typeof coverage?.lastCompletedAt === 'string' ? coverage.lastCompletedAt : null;
    return {items,nextCursor,coverage:{status:'partial',admittedAuthors:this.store.roster(true).length,...coverage,nativeTruncated},
      asOf:new Date().toISOString(),stale:!last || Date.now()-Date.parse(last)>15*60*1000};
  }
}
