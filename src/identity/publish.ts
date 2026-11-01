import { validateDirectoryEvent } from './events';
import type { DirectoryEvent } from './events';

export interface IdentityPublicationRelay {
  publish(
    event: DirectoryEvent,
    signal: AbortSignal
  ): Promise<{ id: string; accepted: boolean }>;
  current(
    pubkey: string,
    kind: number,
    signal: AbortSignal
  ): Promise<DirectoryEvent | null>;
}

/** Call only from the user's publication action, never from page rendering. */
export async function publishIdentityList(
  event: DirectoryEvent,
  relay: IdentityPublicationRelay,
  consent: boolean
): Promise<{ state: 'observed'; eventId: string }> {
  if (consent !== true) throw new Error('publication consent required');
  if (!validateDirectoryEvent(event) || event.kind !== 10011)
    throw new Error('invalid identity list');
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error('publication unconfirmed: timeout'));
      controller.abort();
    }, 3000);
  });
  try {
    const ack = await Promise.race([
      relay.publish(event, controller.signal),
      timeout,
    ]);
    if (ack?.accepted !== true || ack.id !== event.id)
      throw new Error('list not accepted');
    const current = await Promise.race([
      relay.current(event.pubkey, 10011, controller.signal),
      timeout,
    ]);
    if (!validateDirectoryEvent(current) || current.id !== event.id)
      throw new Error('list readback unconfirmed');
    return { state: 'observed', eventId: event.id };
  } finally {
    clearTimeout(timer);
  }
}
