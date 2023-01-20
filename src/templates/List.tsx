import * as React from 'react';
import { useEffect, useState } from 'react';

import {
  ArrowCircleRightOutlined,
  Telegram,
  Twitter,
} from '@mui/icons-material';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Paper, Stack, Tooltip, Typography } from '@mui/material';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import firebase from 'firebase/app';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { Background } from '../background/Background';
import { Button as PrimaryButton } from '../button/Button';
import { Section } from '../layout/Section';
import { auth, db, twitterProvider } from '../utils/firebase';

const List = () => {
  const [row, setRow] = useState<Array<any>>([]);
  const [stats, setStats] = useState({
    tweetCount: 1000,
    verifiedCount: 100,
    donatedCount: 0,
    donationBalance: 1000,
    telegramCount: 100,
    mastodonCount: 100,
    opreturnCount: 0,
  });
  // const [searchText, setSearchText] = useState('');
  const [fetching, setFetching] = useState(false);
  const [inputText, setInputText] = useState('');
  // const [nPubKeyCopied, setNPubCopied] = useState(false);
  // const [hexPubKeyCopied, setHexPubCopied] = useState(false);
  const router = useRouter();

  const dedupArray = (rawArray: any) => {
    let finalArray: any = [];
    for (let index = 0; index < rawArray.length; index += 1) {
      const element = rawArray[index];
      const dupFound = finalArray.find(
        (r: any) =>
          // should also check and prefer the row with verified
          r.hexPubKey === element.hexPubKey &&
          r.screenName === element.screenName
      );
      if (!dupFound) {
        finalArray.push(element);
      } else if (!dupFound.verified && element.verified) {
        // console.log('remove duplicate and add new element instead ');
        const removedArray = finalArray.filter((e: any) => e !== dupFound);
        removedArray.push(element);
        finalArray = removedArray;
      }
    }
    // console.log('finalArray length: ', finalArray.length);
    setRow(finalArray);
  };

  const columns: GridColDef[] = [
    {
      field: 'profileImageUrl',
      headerName: '',
      maxWidth: 50,
      align: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Avatar src={params.value}>
          {/* <img src={'/assets/images/nostrich.jpg'} alt="fallback image" /> */}
        </Avatar>
      ),
    },
    {
      field: 'screenName',
      headerName: 'Twitter Account',
      maxWidth: 200,
      flex: 1,
    },
    {
      field: 'nPubKey',
      headerName: 'nPubKey',
      width: 200,
      flex: 1,
      renderCell: (params: GridRenderCellParams) => (
        <>
          <IconButton
            aria-label="delete"
            onClick={() => {
              navigator.clipboard.writeText(params.value || '');
            }}
          >
            <ContentCopyIcon />
          </IconButton>
          <p>{params.value}</p>
        </>
      ),
    },
    {
      field: 'hexPubKey',
      headerName: 'Hex PubKey',
      width: 200,
      flex: 1,
      renderCell: (params: GridRenderCellParams) =>
        params.value ? (
          <>
            <IconButton
              aria-label="delete"
              onClick={() => {
                navigator.clipboard.writeText(params.value || '');
              }}
            >
              <ContentCopyIcon />
            </IconButton>
            <p>{params.value}</p>
          </>
        ) : (
          <span style={{ width: '100%', textAlign: 'center' }}>-</span>
        ),
    },
    // {
    //   field: 'isValid',
    //   headerName: 'valid?',
    //   headerAlign: 'center',
    //   maxWidth: 100,
    //   flex: 1,
    //   align: 'center',
    //   renderCell: (params: GridRenderCellParams) =>
    //     params.value ? (
    //       <CheckCircleIcon htmlColor="green" />
    //     ) : (
    //       <CancelIcon htmlColor="red" />
    //     ),
    // },
    {
      field: 'verifyEvent',
      headerName: 'verified?',
      headerAlign: 'center',
      maxWidth: 100,
      flex: 1,
      align: 'center',
      renderCell: (params: GridRenderCellParams) =>
        params.value ? (
          <Link href={`https://www.nostr.guru/e/${params.value}`}>
            <a target="_blank">
              <CheckCircleIcon htmlColor="green" />
            </a>
          </Link>
        ) : (
          <Tooltip title="Pubkey is not verified on nostr." placement="top">
            <CancelIcon htmlColor="red" />
          </Tooltip>
        ),
    },
    // {
    //   field: 'url',
    //   headerName: 'Proof URL',
    //   headerAlign: 'center',
    //   maxWidth: 100,
    //   flex: 1,
    //   align: 'center',
    //   renderCell: (params: GridRenderCellParams) => (
    //     <a href={params.value} target="_blank" rel="noreferrer">
    //       <TwitterIcon htmlColor="#1DA1F2" />
    //     </a>
    //   ),
    // },
    {
      field: 'profile',
      headerName: 'Profile',
      headerAlign: 'center',
      maxWidth: 100,
      flex: 1,
      align: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Link href={params.value}>
          <a>
            <ArrowCircleRightOutlined className="text-nostr-light" />
          </a>
        </Link>
      ),
    },
    // { field: 'createdAt', headerName: 'createdAt', width: 150 },
  ];

  const fetchInitialData = async () => {
    // console.log('getting latest records...');
    setRow([]);
    setFetching(true);
    const querySnapshot = await db
      .collection('twitter')
      // .orderBy('createdAt', 'desc')
      .orderBy('user.followers_count', 'desc')
      .limit(50)
      .get();
    const rawArray: any[] = [];
    querySnapshot.forEach((doc: { id: any; data: () => any }) => {
      // console.log(`${doc.id} => `, doc.data());
      const rowData = doc.data();

      if (!rowData.nPubKey && rowData.pubkey.includes('npub'))
        rowData.nPubKey = rowData.pubkey;
      if (
        !rowData.hexPubKey &&
        !rowData.pubkey.includes('npub') &&
        !rowData.pubkey.includes('nsec')
      )
        rowData.hexPubKey = rowData.pubkey;
      if (!rowData.nPubKey && !rowData.hexPubKey) return;

      rowData.id = doc.id;
      rowData.tweetId = rowData.id_str;
      rowData.url = rowData.entities?.urls[0]?.url || '';
      rowData.profile = `/p/${rowData.nPubKey}`;
      rawArray.push(rowData);
    });
    // console.log('rawArray length: ', rawArray.length);
    dedupArray(rawArray);
    setFetching(false);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      db.collection('stats')
        .doc('data')
        .onSnapshot((doc: any) => {
          const statsData: any = doc.data();
          // console.log('got statsData ', statsData);
          setStats(statsData);
        });
    };
    fetchData();
  }, []);

  const popupSignIn = async () => {
    auth
      .signInWithPopup(twitterProvider)
      .then((result) => {
        if (!result.credential) {
          alert('Error getting credentials from twitter API');
          return;
        }

        // eslint-disable-next-line prefer-destructuring
        const credential: firebase.auth.OAuthCredential = result.credential!;
        // const token = credential.accessToken!;
        // const { secret } = credential;
        // The signed-in user info.
        const { user }: any = result;
        // console.log(
        //   'logged in ',
        //   result,
        //   credential,
        //   user,
        //   `/twitter?accessToken=${credential.accessToken}&accessSecret=${credential.secret}&userId=${user?.providerData[0].uid}&screenName=${result?.additionalUserInfo?.profile?.screen_name}`
        // );
        // return;

        if (
          !credential.accessToken ||
          !credential.secret ||
          !user?.providerData[0].uid
        ) {
          alert('Error getting credentials from twitter API');
          return;
        }
        // send credential to twitter page for a checkmark list of twitter follows that are already on nostr.
        window.location.href = `/twitter?accessToken=${credential.accessToken}&accessSecret=${credential.secret}&userId=${user?.providerData[0].uid}&screenName=${result?.additionalUserInfo?.profile?.screen_name}`;
      })
      .catch((error) => {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        // The email of the user's account used.
        const { email } = error;
        // The firebase.auth.AuthCredential type that was used.
        const { credential } = error;
        // ...
        console.log(
          'signin error ',
          errorCode,
          errorMessage,
          email,
          credential
        );
      });
  };

  return (
    <Background color="bg-gray-100">
      <Section
        title="Nostr Public Key Database"
        // description={`Here is a list of ${stats.tweetCount!} twitter accounts that tweeted their nostr public keys. ${stats.verifiedCount!} verified those keys on nostr.`}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          className="justify-center m-4 p-2"
        >
          <Paper className="!p-2 text-center">
            <Typography
              variant="h6"
              color="text.secondary"
              className="!text-center !m-2"
            >
              Tweets
            </Typography>
            <Typography
              variant="h5"
              color="text.secondary"
              className="!text-center !m-2 !text-nostr-light"
            >
              {stats.tweetCount}
            </Typography>
          </Paper>
          <Paper className="!p-2 !text-center">
            <Typography
              variant="h6"
              color="text.secondary"
              className="!text-center !m-2"
            >
              <Twitter htmlColor="#1DA1F2" />
            </Typography>{' '}
            <Typography
              variant="h5"
              color="text.secondary"
              className="!text-center !m-2 !text-nostr-light"
            >
              {stats.verifiedCount}
            </Typography>
          </Paper>
          <Paper className="!p-2 !text-center">
            <Typography
              variant="h6"
              color="text.secondary"
              className="!text-center !m-2"
            >
              <Telegram htmlColor="#2AABEE" />
            </Typography>{' '}
            <Typography
              variant="h5"
              color="text.secondary"
              className="!text-center !m-2 !text-nostr-light"
            >
              {stats.telegramCount}
            </Typography>
          </Paper>
          <Paper className="!p-2 !text-center">
            <Typography
              variant="h6"
              color="text.secondary"
              className="!text-center !m-2 flex justify-center min-h-[32px]"
            >
              <Image
                src={'/assets/images/Mastodonlogo.svg'}
                alt="mastodon logo"
                width={24}
                height={24}
                // className="!m-2"
              />
            </Typography>{' '}
            <Typography
              variant="h5"
              color="text.secondary"
              className="!text-center !m-2 !text-nostr-light"
            >
              {stats.mastodonCount}
            </Typography>
          </Paper>
          <Paper className="!p-2 !text-center">
            <Typography
              variant="h6"
              color="text.secondary"
              className="!text-center !m-2"
            >
              <Image
                src={'/assets/images/mempool.png'}
                alt="OP_RETURN timestamped npub count"
                width={24}
                height={24}
              />
            </Typography>{' '}
            <Typography
              variant="h5"
              color="text.secondary"
              className="!text-center !m-2 !text-nostr-light"
            >
              {stats.opreturnCount}
            </Typography>
          </Paper>
        </Stack>
        <TextField
          id="profile-basic"
          // label="Outlined"
          variant="outlined"
          placeholder="Search by twitter screen name or pubkey e.g. jack or npub1melv..."
          // onChange={handleChange}
          onChange={(event) => {
            setInputText(event.target.value);
          }}
          onKeyPress={(event) => {
            if (event.key === 'Enter') {
              router.push(`/p/${inputText}`);
            }
          }}
          value={inputText}
          fullWidth
          InputProps={{
            // startAdornment: (
            //   <InputAdornment sx={{ backgroundColor: 'gray' }} position="start">
            //     twitter.com/
            //   </InputAdornment>
            // ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="go to profile"
                  disabled={!inputText}
                  onClick={() => router.push(`/p/${inputText}`)}
                >
                  <ArrowCircleRightOutlined
                    className={inputText && 'text-nostr-light'}
                  />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Typography
          variant="h4"
          color="text.primary"
          className="text-center !mb-2 !mt-4"
        >
          Popular Accounts
        </Typography>

        <div style={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={row}
            columns={columns}
            pageSize={100}
            // rowsPerPageOptions={[50]}
            hideFooter
            loading={row.length === 0 && fetching}
            disableSelectionOnClick
            disableColumnFilter
            disableColumnSelector
            disableDensitySelector
            components={{
              NoRowsOverlay: () => (
                <Stack
                  height="100%"
                  alignItems="center"
                  justifyContent="center"
                >
                  No entries found
                </Stack>
              ),
            }}
            // Toolbar: GridToolbar,
            // components={{ FilterPanel: GridFilterPanel }}
            // componentsProps={{
            //   toolbar: {
            //     showQuickFilter: true,
            //     quickFilterProps: {
            //       debounceMs: 500,
            //     },
            //   },
            // }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'end',
          }}
          className="text-xl my-4"
          onClick={popupSignIn}
        >
          To add your twitter follows to your nostr contact list{' '}
          <PrimaryButton>Sign in with Twitter</PrimaryButton>
        </div>
      </Section>
    </Background>
  );
};

export { List };
