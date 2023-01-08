/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/naming-convention */
import { NextApiRequest, NextApiResponse } from 'next';
import Twit from 'twit';

import { db } from '../../utils/firebase';

const { CONSUMER_KEY, CONSUMER_SECRET } = process.env;
// const countPerRequest = 5000;

// function getIds(userTwit, userId, previous_cursor) {
//   // Submit another request using the last_id
//   userTwit.get(
//     'friends/ids',
//     { user_id: userId, count: 200, last_id: lastId },
//     (err, data) => {
//       console.log('data ', data);
//     }
//   );
// }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  // loop through user's follows list and return list of nostrdirectory tweets that are found to match
  try {
    // console.log('START timing twitter API call: ', new Date());
    if (
      !req.query.accessToken ||
      !req.query.accessSecret ||
      !req.query.userId
    ) {
      throw new Error('Missing parameter');
    }
    if (
      Array.isArray(req.query.accessToken) ||
      Array.isArray(req.query.accessSecret) ||
      Array.isArray(req.query.userId)
    ) {
      throw new Error('parameter can not be an array');
    }
    const { accessToken, accessSecret, userId } = req.query;

    const userTwit = new Twit({
      consumer_key: CONSUMER_KEY!,
      consumer_secret: CONSUMER_SECRET!,
      access_token: accessToken,
      access_token_secret: accessSecret,
    });

    userTwit.get(
      'friends/ids',
      { user_id: userId, count: 5000, stringify_ids: true },
      async (err, data: any) => {
        // console.log('err, data ', err, data);
        if (err || !data.ids) {
          console.log('friends/ids err: ', err.message);
          res
            .status(500)
            .json({ error: 'Error fetching follows list from Twitter API' });
          // throw new Error('Error fetching follows list from Twitter API');
        }

        // probably need to check rate-limits at some point
        // console.log(`Rate: ${response.headers['x-rate-limit-remaining']} / ${response.headers['x-rate-limit-limit']}`);
        // const delta = (response.headers['x-rate-limit-reset'] * 1000) - Date.now()
        // console.log(`Reset: ${Math.ceil(delta / 1000 / 60)} minutes`);

        // , next_cursor, total_count
        const { ids } = data;
        // console.log(
        //   'ids, next_cursor, total_count ',
        //   ids
        //   // next_cursor,
        //   // total_count
        // );

        const foundIds: any[] = [];
        // loop through the ids 10 at a time to find matches in db
        for (let index = 0; index < ids.length; index += 10) {
          const element = ids.slice(index, index + 10);
          const elementStr = element.map(String);
          const twitterRef = db.collection('twitter');
          const query = await twitterRef
            .where('userId', 'in', elementStr)
            .get();
          query.forEach((doc: any) => {
            const fsObj = doc.data();
            fsObj.id = doc.id;
            foundIds.push(fsObj);
          });
        }

        // console.log('END timing twitter API call: ', new Date());
        res.status(200).json(foundIds);

        // TODO: later only if user has more than 5000 follows
        // const testUserId = '1330538176121884673'; // has more than 5000 follows
        // if (total_count > 5000)
        // const idsArray = [];
        // for (
        //   let index = 0;
        //   index < total_count / countPerRequest + 1;
        //   index++
        // ) {
        //   idsArray.push(getIds(userTwit, userId, lastId));
        // }
      }
    );
  } catch (error: any) {
    console.log('twitter api error ', error.message);
    res.status(404).json({
      error: error.message,
    });
  }
}
