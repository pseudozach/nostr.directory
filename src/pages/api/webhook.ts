import type { NextApiRequest, NextApiResponse } from 'next';
import 'websocket-polyfill';
import * as nostrTools from 'nostr-tools';
import { verifySecret } from 'verify-github-webhook-secret';

const { GH_WEBHOOK_SECRET, GH_NOSTRBOT_PUBKEY, GH_NOSTRBOT_SECKEY } =
  process.env;

type ResponseData =
  | {
      status: string;
    }
  | {
      error: string;
    };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // webhooks from github -> nostr
  try {
    const valid = await verifySecret(
      JSON.stringify(req.body),
      GH_WEBHOOK_SECRET || '',
      req.headers['x-hub-signature']
    );
    if (!valid) {
      throw new Error('Unauthorized webhook');
    }
    console.log('req.body ', req.body);
    let note = '';
    if (req.body?.workflow_job?.workflow_name)
      note = `${req.body?.workflow_job?.workflow_name} ${req.body?.action}`;

    if (req.body?.check_run)
      note = `check_run ${req.body?.check_run?.html_url} ${req.body?.check_run?.status} ${req.body?.check_run?.conclusion}`;

    if (req.body?.starred_at)
      note = `${req.body?.sender?.login} starred. stargazers_count: ${req.body?.repository.stargazers_count} https://github.com/pseudozach/nostr.directory/stargazers`;

    if (req.body?.head_commit)
      note = `${req.body?.head_commit.author.username} pushed commit: ${req.body?.head_commit.message} https://github.com/pseudozach/nostr.directory/commits`;

    if (req.body?.forkee)
      note = `${req.body?.sender?.login} forked. forks_count: ${req.body?.repository.forks_count} https://github.com/pseudozach/nostr.directory/network/members`;

    if (!note) throw new Error('not worth publishing');
    console.log('note is ready to publish', note);
    const relay = nostrTools.relayInit('wss://nostr-pub.wellorder.net');
    await relay.connect();
    relay.on('connect', async () => {
      // console.log(`connected to ${relay.url}`);

      // publish note on nostr
      const updatedEvent: nostrTools.Event = {
        kind: nostrTools.Kind.Text,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        pubkey: GH_NOSTRBOT_PUBKEY || '',
        content: note,
      };

      updatedEvent.id = nostrTools.getEventHash(updatedEvent);
      // console.log('updatedEvent ', updatedEvent);

      updatedEvent.sig = await nostrTools.signEvent(
        updatedEvent,
        GH_NOSTRBOT_SECKEY || ''
      );

      // console.log('signed note ', updatedEvent);
      const pub = relay.publish(updatedEvent);
      // pub.on('ok', () => {
      //   console.log(`${relay.url} has accepted our event`);
      // });
      pub.on('seen', async () => {
        console.log(`we saw the event on ${relay.url}`);
        await relay.close();
      });
      pub.on('failed', (reason: any) => {
        console.log(`failed to publish to ${relay.url}: `, reason);
      });
    });

    res.status(200).json({ status: 'ok' });
  } catch (error: any) {
    console.log('webhook api error ', error.message);
    res.status(500).json({
      error: error.message,
    });
  }
}
