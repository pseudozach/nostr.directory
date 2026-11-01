import type { DirectoryEvent } from '../../../src/identity/events';
import { latest, validateDirectoryEvent } from '../../../src/identity/events';
import type { DirectoryStore } from './store';

export interface DirectoryRelay {
  publish(event: DirectoryEvent, signal: AbortSignal): Promise<{ id: string; accepted: boolean }>;
  current(pubkey: string, kind: number, signal: AbortSignal): Promise<DirectoryEvent | null>;
}

async function deadline<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error('relay timeout'));
      controller.abort();
    }, 3000);
  });
  try { return await Promise.race([operation(controller.signal), timeout]); }
  finally { clearTimeout(timer); }
}

/** One admission; discovery windows and their completion checkpoints are caller-owned. */
export async function ingest(event: DirectoryEvent, relay: DirectoryRelay, store: DirectoryStore): Promise<void> {
  if (!validateDirectoryEvent(event)) throw new Error('invalid directory event');
  const release = store.reserveAuthor(event.pubkey);
  try {
    const ack = await deadline((signal) => relay.publish(event, signal));
    if (ack?.accepted !== true || ack.id !== event.id) throw new Error('relay did not accept original');
    const current = await deadline((signal) => relay.current(event.pubkey, event.kind, signal));
    if (!current) throw new Error('relay readback missing');
    if (!validateDirectoryEvent(current) || current.pubkey !== event.pubkey || current.kind !== event.kind
      || latest(event, current).id !== current.id) throw new Error('relay readback invalid');
    store.apply(current);
  } finally { release(); }
}
