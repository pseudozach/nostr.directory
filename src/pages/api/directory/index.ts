import type { NextApiRequest, NextApiResponse } from 'next';

import { directoryOrigin } from '../../../directory/config';
import { readDirectory } from '../../../directory/proxy';

export default async function directory(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const result = await readDirectory(directoryOrigin(), req.query);
  return res.status(result.status).json(result.body);
}
