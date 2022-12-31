/* eslint-disable @typescript-eslint/no-loop-func */
/* eslint-disable no-await-in-loop */
import * as React from 'react';
import { useEffect, useState } from 'react';

import { AlternateEmail, ContentCopy } from '@mui/icons-material';
import CurrencyBitcoinIcon from '@mui/icons-material/CurrencyBitcoin';
import TwitterIcon from '@mui/icons-material/Twitter';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import {
  Card,
  CardHeader,
  Avatar,
  CardContent,
  Typography,
  Divider,
  Tooltip,
  Alert,
  Snackbar,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  InputAdornment,
  TextField,
} from '@mui/material';
import axios from 'axios';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { nip19 } from 'nostr-tools';
import * as nostrTools from 'nostr-tools';
import type { ProfilePointer } from 'nostr-tools/nip19';

import { Background } from '../background/Background';
import { Section } from '../layout/Section';
import { db } from '../utils/firebase';
import { defaultRelays, hexToNpub, npubToHex } from '../utils/helpers';

const Profile = () => {
  const [tweet, setTweet] = useState({
    screenName: '',
    entities: {
      urls: [
        {
          url: '',
        },
      ],
    },
    nPubKey: '',
    hexPubKey: '',
    profileImageUrl: '',
    mastodon: '',
    id_str: '',
    verified: false,
    donated: false,
  });
  const [wotScore, setWotScore] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [userRelays, setUserRelays] = useState<Array<any>>([]);
  const [filteredRelays, setFilteredRelays] = useState<Array<any>>([]);
  const [errorAlert, setErrorAlert] = React.useState({
    open: false,
    text: 'Error while doing stuff',
  });
  const [nProfile, setNProfile] = useState('');
  const [nip05, setNip05] = useState('');
  const router = useRouter();

  const handleErrorAlertClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (event && reason === 'clickaway') {
      return;
    }

    setErrorAlert({
      open: false,
      text: 'Error while doing stuff',
    });
  };

  const checkAdd = (relay: { url: string; read: string; write: string }) => {
    // console.log('checkAdd ', userRelays, relay);
    setUserRelays((prevState) =>
      // (prevState) => new Set(prevState).add(relay)
      [...prevState, relay]
    );
    // }
  };

  const fetchInitialData = async () => {
    // console.log('getting profile details... ', router, router.query.id);
    const someIdentifier = router.query.id;
    if (!someIdentifier || Array.isArray(someIdentifier)) {
      return;
    }

    // is someIdentifier npub, hex or nprofile?
    // TODO: convert twitter handle to pubkey as well
    let hexPubKey;
    let nPubKey;
    if (someIdentifier.slice(0, 8) === 'nprofile') {
      try {
        const { type } = nip19.decode(someIdentifier);
        const data = nip19.decode(someIdentifier).data as ProfilePointer;
        if (type !== 'nprofile' || !data.pubkey)
          throw new Error('Invalid nprofile');
        hexPubKey = data.pubkey;
      } catch (error) {
        return;
      }
    } else {
      try {
        // check if npub
        hexPubKey = npubToHex(someIdentifier);
      } catch (error) {
        // console.log('error ', error);
        // check if its hex
        hexPubKey = someIdentifier;
      }
    }

    try {
      nPubKey = hexToNpub(hexPubKey);
    } catch (error) {
      return;
    }

    // should have a valid npub here
    // setUserRelays([]);
    const duplicates: any = [];
    setFetching(true);
    const querySnapshot = await db
      .collection('twitter')
      .where('nPubKey', '==', nPubKey)
      .get();
    let tweetObj: any;
    querySnapshot.forEach((doc: { id: any; data: () => any }) => {
      tweetObj = doc.data();
      duplicates.push(doc.data());
    });

    if (!tweetObj) return;

    // prefer verified if exists
    tweetObj =
      duplicates.find((x: any) => x.verified === true) || duplicates[0];

    console.log('got data ', tweetObj, fetching);

    // calculate wotScore
    let tmpWot = wotScore;
    if (tweetObj.verified) tmpWot += 10;
    if (tweetObj.mastodon) tmpWot += 10;
    if (tweetObj.donated) tmpWot += 10;
    setWotScore(tmpWot);

    setTweet(tweetObj);

    // get nostr profile of user to show users, followers, relays etc.
    for (let index = 0; index < defaultRelays.length; index += 1) {
      const element = defaultRelays[index];
      const relay = nostrTools.relayInit(element!);
      // setRelayConnection(relay);
      await relay.connect();

      relay.on('connect', () => {
        console.log(`connected to ${relay.url}`);

        const sub = relay.sub([
          {
            kinds: [0, 3],
            authors: [tweetObj.hexPubKey],
            // since: 0,
          },
        ]);
        sub.on('event', async (event: any) => {
          // console.log(
          //   'got event and setUserRelays:  ',
          //   event.content,
          //   'adding to ',
          //   userRelays,
          //   '\nparsed: ',
          //   JSON.parse(event.content)
          // );

          if (event.kind === 3) {
            // console.log('got 3 ', event);
            const relayList = JSON.parse(event.content);
            Object.keys(relayList).forEach((k) => {
              // console.log(
              //   'calling checkAdd with k, ',
              //   k,
              //   relayList[k],
              //   userRelays
              // );
              checkAdd({
                url: k,
                read: relayList[k].read,
                write: relayList[k].write,
              });
            });
          }

          if (event.kind === 0) {
            // console.log('got 0 ', event);
            const metadata = JSON.parse(event.content);
            if (metadata.nip05 && nip05 === '') {
              // validate nip05
              const response = await axios.get(
                `https://${
                  metadata.nip05.split('@')[1]
                }/.well-known/nostr.json?name=${metadata.nip05.split('@')[0]}`
              );

              if (
                response.data.names[metadata.nip05.split('@')[0]] ===
                tweetObj.hexPubKey
              ) {
                setNip05(metadata.nip05);
                // increment wotscore
                setWotScore((ws) => ws + 10);
              }
            }
          }
        });
        sub.on('eose', async () => {
          // console.log('eose');
          sub.unsub();
        });
      });
      relay.on('error', () => {
        console.log(`failed to connect to ${relay.url}`);
        setFetching(false);
        setErrorAlert({
          open: true,
          text: `failed to connect to ${relay.url}`,
        });
      });
    }
  };

  useEffect(() => {
    if (router.isReady) fetchInitialData();
  }, [router.isReady]);

  useEffect(() => {
    // console.log('userRelays updated! ', userRelays);
    const uniqueArray = userRelays.filter((value, index) => {
      const y = JSON.stringify(value);
      return (
        index ===
        userRelays.findIndex((obj) => {
          return JSON.stringify(obj) === y;
        })
      );
    });
    setFilteredRelays(uniqueArray);

    // set nip19 profile now that we have relays
    const relays: string[] = filteredRelays.map((a) => a.url);
    const nprofile = nip19.nprofileEncode({
      pubkey: tweet.hexPubKey,
      relays,
    });
    setNProfile(nprofile);

    // console.log('filtered: ', uniqueArray);
  }, [userRelays]);

  return (
    <Background color="bg-gray-100">
      <Section
      // title={`${tweet.screenName}'s profile`}
      // description={`Here is the profile of ${tweet.screenName}`}
      >
        <Card>
          <CardHeader
            avatar={
              <Avatar alt="profile picture" src={tweet.profileImageUrl} />
            }
            action={
              <Tooltip title="WoT Score">
                <Avatar sx={{ backgroundColor: 'green', color: 'white' }}>
                  {wotScore}
                </Avatar>
              </Tooltip>
            }
            title={tweet.screenName}
            titleTypographyProps={{ fontSize: 'x-large' }}
            subheader={`${tweet.nPubKey.slice(0, 8)}...${tweet.nPubKey.slice(
              -8
            )}`}
            className="break-normal"
          />
          <CardContent>
            <Typography variant="h6" color="text.secondary">
              Badges
            </Typography>
            <div className="mt-2 mb-4 flex-col items-center">
              <div className="my-2">
                {tweet.verified === true ? (
                  <>
                    <VerifiedUserIcon color="success" className="mr-2" />
                    User has signed their <b>twitter</b> handle with their nostr
                    private key.
                  </>
                ) : (
                  <>
                    <VerifiedUserIcon color="error" className="mr-2" />
                    User has <b>NOT</b> signed their <b>twitter</b> handle with
                    their nostr private key.
                  </>
                )}
              </div>
              <div className="my-2">
                {tweet.mastodon ? (
                  <>
                    <VerifiedUserIcon color="success" className="mr-2" />
                    User has signed their <b>mastodon</b> profile with their
                    nostr private key.
                  </>
                ) : (
                  <>
                    <VerifiedUserIcon color="error" className="mr-2" />
                    User has <b>NOT</b> signed their <b>mastodon</b> profile
                    with their nostr private key.
                  </>
                )}
              </div>
              <div className="my-2">
                {nip05 ? (
                  <>
                    <AlternateEmail color="success" className="mr-2" />
                    User has a valid NIP-05 identifier: <b>{nip05}</b>
                  </>
                ) : (
                  <>
                    <AlternateEmail color="error" className="mr-2" />
                    User has <b>NOT</b> set a NIP-05 identifier for themselves.
                  </>
                )}
              </div>
              <div className="my-2">
                {tweet.donated === true ? (
                  <>
                    <CurrencyBitcoinIcon htmlColor="orange" className="mr-2" />
                    User has sent a donation to nostr.directory with their nostr
                    pubkey.
                  </>
                ) : (
                  <>
                    <CurrencyBitcoinIcon color="error" className="mr-2" />
                    User has <b>NOT</b> sent a donation to nostr.directory with
                    their nostr pubkey.
                  </>
                )}
              </div>
            </div>
            <Divider />
            <Typography variant="h6" color="text.secondary" className="mt-2">
              NIP19
            </Typography>
            <TextField
              label="hexPubKey"
              id="hexPubKey"
              className="my-2"
              value={tweet.hexPubKey}
              fullWidth
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    {' '}
                    <IconButton
                      aria-label="copy npub"
                      onClick={() => {
                        navigator.clipboard.writeText(tweet.hexPubKey || '');
                      }}
                    >
                      <ContentCopy />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="nPubKey"
              id="nPubKey"
              className="my-2"
              value={tweet.nPubKey}
              fullWidth
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    {' '}
                    <IconButton
                      aria-label="copy hex pubkey"
                      onClick={() => {
                        navigator.clipboard.writeText(tweet.nPubKey || '');
                      }}
                    >
                      <ContentCopy />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="nProfile"
              id="nProfile"
              className="mt-2"
              value={nProfile}
              fullWidth
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    {' '}
                    <IconButton
                      aria-label="copy hex pubkey"
                      onClick={() => {
                        navigator.clipboard.writeText(nProfile || '');
                      }}
                    >
                      <ContentCopy />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <div className="my-4 flex-vertical items-center">
              <TableContainer component={Paper} className="my-2">
                <Table
                // sx={{ minWidth: 650 }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Relay URLs</TableCell>
                      <TableCell align="right">Read</TableCell>
                      <TableCell align="right">Write</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRelays.map((row: any) => (
                      <TableRow
                        key={Math.random()}
                        sx={{
                          '&:last-child td, &:last-child th': { border: 0 },
                        }}
                      >
                        <TableCell component="th" scope="row">
                          {row.url}
                        </TableCell>
                        <TableCell align="right">{`${row.read}`}</TableCell>
                        <TableCell align="right">{`${row.write}`}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>

            <Divider />
            <Typography variant="h6" color="text.secondary" className="mt-2">
              Social Proofs
            </Typography>
            <div className="mt-2 mb-4 flex items-center">
              <TwitterIcon sx={{ height: '40px', width: '40px' }} />
              <a
                href={`https://twitter.com/${tweet.screenName}`}
                className="mx-2 underline"
                target="_blank"
                rel="noreferrer"
              >
                Profile Link
              </a>

              <a
                href={`https://twitter.com/${tweet.screenName}/status/${tweet.id_str}`}
                className="mx-2 underline"
                target="_blank"
                rel="noreferrer"
              >
                Proof Link
              </a>
            </div>
            {tweet.mastodon && (
              <div className="mt-4 flex items-center">
                <Image
                  src={'/assets/images/Mastodonlogo.svg'}
                  alt="mastodon logo"
                  width={40}
                  height={40}
                />
                <a>
                  <a
                    href={`${tweet.mastodon}`}
                    className="mx-2 underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Profile Link
                  </a>
                </a>
                <a
                  href={`${tweet.mastodon}.json`}
                  className="mx-2 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Proof Link
                </a>
              </div>
            )}
          </CardContent>
        </Card>
        <Snackbar
          open={errorAlert.open}
          autoHideDuration={10000}
          onClose={handleErrorAlertClose}
        >
          <Alert
            onClose={handleErrorAlertClose}
            severity="error"
            sx={{ width: '100%' }}
          >
            {errorAlert.text}
          </Alert>
        </Snackbar>
      </Section>
    </Background>
  );
};

export { Profile };
