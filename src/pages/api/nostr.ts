import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

import { db } from '../../utils/firebase';

const { POSTGREST_API, POSTGREST_USERNAME, POSTGREST_PASSWORD } = process.env;

export const header = {
  auth: {
    username: POSTGREST_USERNAME || '',
    password: POSTGREST_PASSWORD || '',
  },
};

type ResponseData =
  | {
      names: object;
    }
  | {
      error: string;
    };

type NIP05 = {
  names: object;
  relays?: object;
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

    const nip5: NIP05 = {
      names: {
        [screenName]: hexPubKey,
      },
    };

    try {
      // get user's latest relay list and serve it as per NIP-05
      const response = await axios.get(
        `${POSTGREST_API}/events?select=event_content&event_kind=eq.2&event_pubkey=eq.\\x${hexPubKey}&order=event_created_at.desc&limit=1`,
        header
      );
      if (response.data[0].event_content) {
        const obj = {
          [hexPubKey]: [response.data[0].event_content],
        };
        nip5.relays = obj;
      }
    } catch (error: any) {
      // console.log('relay check error ', error.message);
    }

    res.status(200).json(nip5);
  } catch (error: any) {
    // console.log('nostr nip05 api error ', error.message);
    res.status(404).json({
      error: error.message,
    });
  }
}
