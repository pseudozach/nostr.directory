import { verifySignature } from 'nostr-tools';
import type { Event } from 'nostr-tools';

type LegacyRelay = {
  publish(event: Event<number>): Promise<void>;
  get(filter: { ids: string[] }): Promise<Event<number> | null>;
};

export async function publishLegacyEvent(
  relay: LegacyRelay,
  event: Event<number>
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const operation = async () => {
    await relay.publish(event);
    const observed = await relay.get({ ids: [event.id] });
    if (!observed || observed.id !== event.id || !verifySignature(observed)) {
      throw new Error('Publication readback was not confirmed');
    }
  };
  try {
    await Promise.race([
      operation(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error('Publication confirmation timed out')),
          3000
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
