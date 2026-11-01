/* eslint-disable no-void, no-await-in-loop, no-restricted-syntax -- Bounded streaming reads and cancellation must be sequential. */
import type { NextApiRequest, NextApiResponse } from 'next';

import { directoryOrigin } from '../../../directory/config';
import { validateDirectoryEvent } from '../../../identity/events';

export const config = { api: { bodyParser: false } };
const LIMIT = 16384;

export async function readSignedBody(
  stream: AsyncIterable<Uint8Array>
): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream) {
    size += chunk.byteLength;
    if (size > LIMIT) throw new Error('Signed event exceeds 16 KiB.');
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(
    new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))
  );
}

export async function postSignedEvent(
  origin: string | undefined,
  event: unknown,
  transport: typeof fetch = fetch
): Promise<{ status: number; body: unknown }> {
  let url: URL;
  try {
    if (!origin) throw new Error('missing service');
    const base = new URL(origin);
    if (
      base.username ||
      base.password ||
      base.pathname !== '/' ||
      base.search ||
      base.hash ||
      (base.protocol !== 'https:' &&
        !(
          base.protocol === 'http:' &&
          ['127.0.0.1', '[::1]'].includes(base.hostname)
        ))
    )
      throw new Error('invalid origin');
    url = new URL('/api/events', base);
  } catch {
    return {
      status: 503,
      body: { error: 'Directory publication unavailable' },
    };
  }
  if (!validateDirectoryEvent(event) || event.kind !== 10011)
    return {
      status: 400,
      body: {
        error:
          'Only a valid owner-signed public kind 10011 event within 16 KiB is accepted',
      },
    };
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      void reader?.cancel().catch(() => {});
      reject(new Error('publication timeout'));
    }, 3000);
  });
  try {
    const operation = async () => {
      const response = await transport(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(event),
        redirect: 'error',
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (
        controller.signal.aborted ||
        !response.ok ||
        response.redirected ||
        response.headers
          .get('content-type')
          ?.split(';')[0]
          ?.trim()
          .toLowerCase() !== 'application/json' ||
        !response.body
      ) {
        void response.body?.cancel().catch(() => {});
        throw new Error('invalid service response');
      }
      reader = response.body.getReader();
      const chunks: Buffer[] = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > LIMIT) throw new Error('response too large');
          chunks.push(Buffer.from(value));
        }
      } finally {
        void reader.cancel().catch(() => {});
      }
      const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (result.accepted !== true || result.eventId !== event.id)
        throw new Error('publication not confirmed');
      return { status: 200, body: { accepted: true, eventId: event.id } };
    };
    return await Promise.race([operation(), deadline]);
  } catch {
    return {
      status: 502,
      body: {
        error: 'Publication unconfirmed; check current state before retrying',
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

export default async function publish(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (
    req.headers['content-type']?.split(';')[0]?.trim().toLowerCase() !==
    'application/json'
  )
    return res
      .status(415)
      .json({ error: 'Only public signed event JSON is accepted' });
  if (Number(req.headers['content-length'] ?? 0) > LIMIT)
    return res.status(413).json({ error: 'Signed event exceeds 16 KiB' });
  let event: unknown;
  try {
    event = await readSignedBody(req);
  } catch (cause) {
    return res
      .status(
        cause instanceof Error && cause.message.includes('16 KiB') ? 413 : 400
      )
      .json({ error: 'Invalid signed event JSON or 16 KiB limit exceeded' });
  }
  const result = await postSignedEvent(directoryOrigin(), event);
  return res.status(result.status).json(result.body);
}
