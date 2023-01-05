/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/naming-convention */
import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from 'twitter-api-sdk';

const { BEARER_TOKEN } = process.env;

const client = new Client(BEARER_TOKEN || '');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  // get new pfp for some people because for some reason they change it and the links break
  // https://github.com/pseudozach/nostr.directory/issues/11
  try {
    if (!req.query.userId) {
      throw new Error('Missing parameter');
    }
    if (Array.isArray(req.query.userId)) {
      throw new Error('parameter can not be an array');
    }
    const { userId } = req.query;

    const userObject = await client.users.findUserById(userId, {
      'user.fields': ['profile_image_url'],
    });
    res.status(200).json(userObject.data);
  } catch (error: any) {
    console.log('twitterpfp api error ', error.message);
    res.status(500).json({
      error: error.message,
    });
  }
}
