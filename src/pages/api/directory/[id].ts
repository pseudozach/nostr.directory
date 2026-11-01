import type { NextApiRequest, NextApiResponse } from 'next';

import { directoryOrigin } from '../../../directory/config';
import { readPerson } from '../../../directory/proxy';

export default async function person(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const result = await readPerson(directoryOrigin(), req.query.id);
  return res.status(result.status).json(result.body);
}
