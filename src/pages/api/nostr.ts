import type { NextApiRequest, NextApiResponse } from 'next';

import { db } from '../../utils/firebase';

type ResponseData =
  | {
      names: object;
    }
  | {
      error: string;
    };

// async function resolveNPubKey(screenName: string) {
//   let nPubKey = '';
//   const nPubKeyquery = await db
//     .collection('twitter')
//     .where('screenName', '==', screenName)
//     .get();
//   nPubKeyquery.forEach((doc) => {
//     const tweet = doc.data();
//     nPubKey = tweet.nPubKey;
//   });
//   // console.log('found nPubKey ', nPubKey);
//   if (!nPubKey) throw new Error('user not found');
//   return nPubKey;
// }

async function resolveHexPubKey(screenName: string) {
  let hexPubKey = '';
  const hexPubKeyquery = await db
    .collection('twitter')
    .where('lcScreenName', '==', screenName)
    .get();
  let verifiedHexPubKey: string = '';
  hexPubKeyquery.forEach((doc) => {
    const tweet = doc.data();
    if (tweet.verified) {
      verifiedHexPubKey = tweet.hexPubKey;
    }
    hexPubKey = tweet.hexPubKey;
  });
  if (verifiedHexPubKey) hexPubKey = verifiedHexPubKey;
  // console.log('found hexPubKey ', hexPubKey);
  if (!hexPubKey) throw new Error('user not found');
  return hexPubKey;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // nostr nip05: https://<domain>/.well-known/nostr.json?name=<local-part>
  try {
    if (!req.query.name) {
      throw new Error('Missing name parameter');
    }
    if (Array.isArray(req.query.name)) {
      throw new Error('string can not be an array');
    }
    const screenName: string = req.query.name!.toLowerCase();
    // console.log('resolving screenName ', screenName);
    // const nPubKey = await resolveNPubKey(screenName);
    const hexPubKey = await resolveHexPubKey(screenName);
    const nip5 = {
      names: {
        [screenName]: hexPubKey,
      },
    };
    res.status(200).json(nip5);
  } catch (error: any) {
    // console.log('nostr nip05 api error ', error.message);
    res.status(404).json({
      error: error.message,
    });
  }
}
