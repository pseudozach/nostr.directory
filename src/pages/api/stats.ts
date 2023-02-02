/* eslint-disable array-callback-return */
import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

import {
  cumulativePubKeyQuery,
  dailyEventCountQuery,
  dailyEventsByKindQuery,
} from '../../utils/helpers';

const { GRAFANA_API, GRAFANA_USERNAME, GRAFANA_PASSWORD } = process.env;

export const header = {
  auth: {
    username: GRAFANA_USERNAME || '',
    password: GRAFANA_PASSWORD || '',
  },
};

type ResponseData =
  | {
      names: object;
    }
  | {
      error: string;
    };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // fetch stats from grafana and serve
  try {
    if (!req.query.type) {
      throw new Error('Missing type parameter');
    }
    if (Array.isArray(req.query.type)) {
      throw new Error('string can not be an array');
    }
    const statType: string = req.query.type;
    let data: any;
    if (statType === 'cumulativePubKey') {
      data = cumulativePubKeyQuery;
    } else if (statType === 'dailyEventsByKind') {
      data = dailyEventsByKindQuery;
    } else {
      data = dailyEventCountQuery;
    }
    data.from = `${new Date(
      new Date().getTime() - 9 * 24 * 60 * 60 * 1000
    ).getTime()}`;
    data.to = `${new Date().getTime()}`;
    // console.log('data ', data);
    const response = await axios.post(`${GRAFANA_API}`, data, header);
    const { values } = response.data.results.A.frames[0].data;
    // console.log('got data ', values);
    const arr1 = values[0];
    const arr2 = values[1];

    let resultArray = [];
    if (statType === 'cumulativePubKey') {
      resultArray = arr1.map((x: number, i: number) => {
        // skip first value because it's low due to the timestamp filter
        if (i !== 0 && x > data.from) {
          return {
            x: new Date(x).toLocaleDateString(),
            y: arr2[i],
          };
        }
        return null;
      });
      resultArray = resultArray.filter(Boolean);
    } else if (statType === 'dailyEventsByKind') {
      resultArray = arr1.map((x: number, i: number) => {
        // skip first value because it's low due to the timestamp filter
        if (i !== 0) {
          return {
            x: new Date(x).toLocaleDateString().slice(0, -5),
            y: arr2[i],
          };
        }
        return null;
      });
    } else {
      resultArray = arr1.map((x: number, i: number) => {
        // skip first value because it's low due to the timestamp filter
        if (i !== 0) {
          return {
            x: new Date(x).toLocaleDateString().slice(0, -5),
            y: arr2[i],
          };
        }
        return null;
      });
    }

    res.status(200).json(resultArray);
  } catch (error: any) {
    console.log('stats api error ', error.message);
    res.status(500).json({
      error: error.message,
    });
  }
}
