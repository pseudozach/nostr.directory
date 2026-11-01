export const DIRECTORY_TIMEOUT_MS = 10000;

// Covers connection, body decoding and compatibility lookups, even when an
// underlying SDK ignores cancellation. Never turn an unknown result into absence.
export async function directoryRequest<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel: () => void = () => {};
  const deadline = new Promise<never>((_resolve, reject) => {
    cancel = () => {
      controller.abort();
      reject(new Error('Directory request cancelled.'));
    };
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new Error(
          'Directory request timed out. Please retry; current state is unknown.'
        )
      );
    }, DIRECTORY_TIMEOUT_MS);
  });
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) cancel();
  try {
    return await Promise.race([
      controller.signal.aborted ? deadline : operation(controller.signal),
      deadline,
    ]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}
