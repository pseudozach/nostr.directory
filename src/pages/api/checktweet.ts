import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from 'twitter-api-sdk';

const { BEARER_TOKEN } = process.env;

const client = new Client(BEARER_TOKEN || '');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  // check to see if a tweet link is valid.
  try {
    if (!req.query.tweetId) {
      throw new Error('Missing parameter');
    }
    if (Array.isArray(req.query.tweetId)) {
      throw new Error('parameter can not be an array');
    }
    const { tweetId } = req.query;

    const tweetObject = await client.tweets.findTweetById(tweetId);
    // console.log('tweetObject ', tweetObject);
    if (
      tweetObject?.errors &&
      tweetObject?.errors[0]?.title === 'Not Found Error'
    ) {
      res.status(200).json({ status: 'Not Found' });
    } else {
      res.status(200).json({ status: 'OK' });
    }
  } catch (error: any) {
    console.log('checktweet api error ', error.message);
    res.status(500).json({
      error: error.message,
    });
  }
}
