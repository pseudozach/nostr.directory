import * as React from 'react';
import { useEffect, useState } from 'react';

import { Search, ContentCopyRounded } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import firebase from 'firebase/app';
import Link from 'next/link';
import { useRouter } from 'next/router';

import Counter from '../counter/Counter';
import { Section } from '../layout/Section';
import SignTw from '../signTw/signTw';
import { auth, db, twitterProvider } from '../utils/firebase';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      // hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {/* {value === index && ( */}
      <Box sx={{ p: 3 }}>
        <Typography>{children}</Typography>
      </Box>
      {/* )} */}
    </div>
  );
}

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
  const [openToast, setOpenToast] = React.useState(false);
  const [tabValue, setTabValue] = React.useState(0);

  const handleClickToast = () => {
    setOpenToast(true);
  };

  const handleCloseToast = (
    event: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') {
      return;
    }

    setOpenToast(false);
  };

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

  const fetchInitialData = async () => {
    // console.log('getting latest records...');
    setRow([]);
    setFetching(true);
    let querySnapshot;
    if (tabValue === 0) {
      querySnapshot = await db
        .collection('twitter')
        // .orderBy('createdAt', 'desc')
        .orderBy('user.followers_count', 'desc')
        .limit(50)
        .get();
    } else if (tabValue === 1) {
      querySnapshot = await db
        .collection('twitter')
        .orderBy('donated', 'desc')
        .limit(50)
        .get();
    } else {
      // tabValue === 2
      // get highest follower count as kept up-to-date
      querySnapshot = await db
        .collection('twitter')
        .orderBy('nFollowerCount', 'desc')
        .limit(50)
        .get();
    }

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
      rowData.followersCount = rowData.user.followers_count;
      rawArray.push(rowData);
    });
    // console.log('rawArray length: ', rawArray.length);
    dedupArray(rawArray);
    setFetching(false);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // console.log('tab changed to ', newValue);
    // // fetch and populate rows!
    // fetchInitialData();
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [tabValue]);

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
  const action = (
    <React.Fragment>
      <IconButton
        size="small"
        aria-label="close"
        color="inherit"
        onClick={handleCloseToast}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </React.Fragment>
  );
  const columns: GridColDef[] = [
    {
      field: 'profileImageUrl',
      headerName: '',
      maxWidth: 70,
      align: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Avatar src={params.value} />
      ),
    },
    {
      field: 'screenName',
      headerName: 'Twitter Account',
      maxWidth: 275,
      minWidth: 200,
      flex: 1,
    },
    {
      field: 'nPubKey',
      headerName: 'nPubKey',
      minWidth: 250,

      renderCell: (params: GridRenderCellParams) => (
        <>
          <IconButton
            aria-label="delete"
            onClick={() => {
              navigator.clipboard.writeText(params.value || '');
              handleClickToast();
            }}
          >
            <ContentCopyRounded />
          </IconButton>
          <p>
            {params.value
              .substring(0, 8)
              .concat('...')
              .concat(params.value.substring(params.value.length - 8))}
          </p>
        </>
      ),
    },
    {
      field: 'hexPubKey',
      headerName: 'Hex PubKey',
      minWidth: 250,

      renderCell: (params: GridRenderCellParams) =>
        params.value ? (
          <>
            <IconButton
              aria-label="delete"
              onClick={() => {
                navigator.clipboard.writeText(params.value || '');
                handleClickToast();
              }}
            >
              <ContentCopyRounded />
            </IconButton>
            <p style={{ marginLeft: '5px' }}>
              {params.value
                .substring(0, 8)
                .concat('...')
                .concat(params.value.substring(params.value.length - 8))}
            </p>
          </>
        ) : (
          <span style={{ width: '100%', textAlign: 'center' }}>-</span>
        ),
    },
    {
      field: 'followersCount',
      headerName: 'Followers',
      headerAlign: 'center',
      hide: tabValue !== 0,
      maxWidth: 100,
      flex: 1,
      align: 'center',
      renderCell: (params: GridRenderCellParams) => params.value,
      //  ? (
      //   <CheckCircleIcon htmlColor="green" />
      // ) : (
      //   <CancelIcon htmlColor="red" />
      // ),
    },
    {
      field: 'donated',
      headerName: 'Donation',
      headerAlign: 'center',
      hide: tabValue !== 1,
      maxWidth: 100,
      flex: 1,
      align: 'center',
      renderCell: (params: GridRenderCellParams) => params.value,
      //  ? (
      //   <CheckCircleIcon htmlColor="green" />
      // ) : (
      //   <CancelIcon htmlColor="red" />
      // ),
    },
    {
      field: 'nFollowerCount',
      headerName: 'Followers',
      headerAlign: 'center',
      hide: tabValue !== 2,
      maxWidth: 100,
      flex: 1,
      align: 'center',
      renderCell: (params: GridRenderCellParams) => params.value,
      //  ? (
      //   <CheckCircleIcon htmlColor="green" />
      // ) : (
      //   <CancelIcon htmlColor="red" />
      // ),
    },
    {
      field: 'verifyEvent',
      headerName: 'Status',
      headerAlign: 'center',
      maxWidth: 250,
      minWidth: 150,
      flex: 1,
      align: 'center',
      renderCell: (params: GridRenderCellParams) =>
        params.value ? (
          <Link href={`https://www.nostr.guru/e/${params.value}`}>
            <a target="_blank">
              <div>
                <img src="/assets/images/verified.png" alt="" />
                <p>Verified</p>
                <style jsx>{`
                  div {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    padding: 4px 12px;
                    gap: 6px;
                    background: rgba(58, 204, 142, 0.08);
                    border-radius: 24px;
                  }
                  p {
                    font-weight: 500;
                    font-size: 13px;
                    color: #3acc8e;
                    display: flex;
                    align-items: center;
                  }
                `}</style>
              </div>
            </a>
          </Link>
        ) : (
          <Tooltip title="Pubkey is not verified on nostr." placement="top">
            <div>
              <img src="/assets/images/not verified.png" alt="" />
              <p>Verified</p>
              <style jsx>{`
                div {
                  display: flex;
                  flex-direction: row;
                  align-items: center;
                  padding: 4px 12px;
                  gap: 6px;
                  background: rgba(230, 80, 80, 0.08);
                  border-radius: 24px;
                }
                p {
                  font-weight: 500;
                  font-size: 13px;
                  color: #e65050;
                  display: flex;
                  align-items: center;
                }
              `}</style>
            </div>
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
      maxWidth: 150,
      minWidth: 150,
      flex: 1,
      align: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Link href={params.value}>
          <a>
            <div>
              <p>Visit Profile</p>
              <style jsx>{`
                div {
                  flex-direction: row;
                  align-items: center;
                  padding: 4px 12px;
                  border-radius: 24px;
                }
                div:hover {
                  background: rgba(29, 67, 88, 0.08);
                }
                p {
                  font-weight: 500;
                  font-size: 13px;
                  background: linear-gradient(
                    158.74deg,
                    #46bfee 14.86%,
                    #1adace 102.75%
                  );
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  background-clip: text;
                  text-fill-color: transparent;
                }
              `}</style>
            </div>
          </a>
        </Link>
      ),
    },
    // { field: 'createdAt', headerName: 'createdAt', width: 150 },
  ];

  return (
    <Section
      mxWidth="max-w-screen-xl"
      yPadding="pt-0"
      title="Nostr Public Key Database"
      // description={`Here is a list of ${stats.tweetCount!} twitter accounts that tweeted their nostr public keys. ${stats.verifiedCount!} verified those keys on nostr.`}
    >
      <div className="flex flex-row justify-center gap-3 mb-[52px] flex-wrap">
        <Counter stats={stats.tweetCount} text={'Tweets'} />
        <Counter
          stats={stats.verifiedCount}
          icon={
            <svg
              width="32"
              height="26"
              viewBox="0 0 32 26"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M31.0936 5.58666C31.3767 5.35131 31.4155 4.93098 31.1801 4.64783C31.0891 4.53826 30.9653 4.46075 30.8269 4.42666L29.7736 4.16C29.4164 4.07058 29.1994 3.70855 29.2888 3.35138C29.2996 3.30842 29.3146 3.26665 29.3336 3.22666L29.9203 2.04C30.0801 1.70832 29.9408 1.30985 29.6092 1.15C29.4652 1.08064 29.3012 1.06526 29.1469 1.10666L26.4803 1.85333C26.2788 1.91208 26.0615 1.87257 25.8936 1.74666V1.74666C24.7396 0.881182 23.3361 0.41333 21.8936 0.41333C18.2117 0.41333 15.2269 3.3981 15.2269 7.08V7.56V7.56C15.2282 7.72954 15.1019 7.87299 14.9336 7.89333C11.1869 8.33333 7.60026 6.42666 3.7336 1.97333C3.56234 1.78446 3.29983 1.70725 3.0536 1.77333C2.83197 1.8752 2.68367 2.08998 2.66693 2.33333L2.66693 2.33333C2.13287 4.52712 2.3488 6.83656 3.28026 8.89333C3.36328 9.05765 3.29737 9.25815 3.13305 9.34116C3.0715 9.37226 3.00181 9.3835 2.9336 9.37333L1.44026 9.08C1.07674 9.02155 0.734671 9.26886 0.676226 9.63238C0.663731 9.7101 0.665098 9.78942 0.680265 9.86666L0.680265 9.86666C0.91345 11.9394 2.07612 13.7938 3.84027 14.9067C4.00595 14.9869 4.07521 15.1863 3.99497 15.352C3.96228 15.4195 3.90777 15.474 3.84027 15.5067L3.1336 15.7867C2.79185 15.9237 2.62587 16.3118 2.76288 16.6535C2.77012 16.6716 2.77814 16.6893 2.78693 16.7067C3.58018 18.4424 5.17484 19.6783 7.0536 20.0133C7.22665 20.0761 7.31602 20.2673 7.25321 20.4404C7.21952 20.5332 7.14641 20.6063 7.0536 20.64H7.0536C5.24074 21.3898 3.29529 21.7662 1.3336 21.7467C0.965408 21.673 0.607235 21.9118 0.533597 22.28C0.459959 22.6482 0.698741 23.0064 1.06693 23.08H1.06693C4.46365 24.691 8.16184 25.5678 11.9203 25.6533C15.2262 25.7037 18.4733 24.776 21.2536 22.9867L21.2536 22.9867C25.8986 19.886 28.6819 14.6648 28.6669 9.07999V7.91999V7.92C28.6686 7.72404 28.7563 7.53874 28.9069 7.41333L31.0936 5.58666Z"
                fill="url(#paint0_linear_186_1217)"
              />
              <defs>
                <linearGradient
                  id="paint0_linear_186_1217"
                  x1="26.764"
                  y1="-2.74191"
                  x2="35.6816"
                  y2="25.2353"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#46BFEE" />
                  <stop offset="1" stopColor="#1ADACE" />
                </linearGradient>
              </defs>
            </svg>
          }
        />
        <Counter
          stats={stats.telegramCount}
          icon={
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14 0C6.26799 0 0 6.26799 0 14C0 21.732 6.26799 28 14 28C21.732 28 28 21.732 28 14C28 6.26799 21.732 0 14 0ZM20.4892 9.52113C20.2785 11.7349 19.3669 17.107 18.9029 19.5865C18.7067 20.6355 18.3202 20.9874 17.9462 21.0217C17.1333 21.0966 16.5158 20.4845 15.7284 19.9683C14.4962 19.1606 13.8001 18.6578 12.604 17.8696C11.2218 16.9587 12.1178 16.4583 12.9056 15.6397C13.1117 15.4256 16.6939 12.1674 16.7632 11.8718C16.7718 11.8349 16.7801 11.6968 16.698 11.6243C16.616 11.5519 16.4954 11.5764 16.4082 11.5961C16.2846 11.6242 14.3162 12.9253 10.5029 15.4993C9.9442 15.8829 9.43813 16.0699 8.98467 16.0601C8.48479 16.0493 7.52325 15.7775 6.8084 15.5451C5.93165 15.2601 5.23481 15.1094 5.2955 14.6254C5.32711 14.3733 5.67429 14.1155 6.33703 13.852C10.4183 12.0739 13.1398 10.9016 14.5015 10.3351C18.3895 8.71793 19.1973 8.43703 19.7239 8.42766C19.8397 8.42574 20.0987 8.45442 20.2664 8.59052C20.378 8.68748 20.4491 8.82278 20.4657 8.96965C20.4941 9.15202 20.502 9.337 20.4892 9.52113Z"
                fill="url(#paint0_linear_186_1221)"
              />
              <defs>
                <linearGradient
                  id="paint0_linear_186_1221"
                  x1="23.8472"
                  y1="-3.5"
                  x2="35.4004"
                  y2="26.1918"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#46BFEE" />
                  <stop offset="1" stopColor="#1ADACE" />
                </linearGradient>
              </defs>
            </svg>
          }
        />
        <Counter
          stats={stats.mastodonCount}
          icon={
            <svg
              width="29"
              height="28"
              viewBox="0 0 29 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M28.6278 9.48871C28.6278 3.78566 24.3557 2.11347 24.3557 2.11347C20.1634 0.429543 9.02957 0.447145 4.87751 2.11347C4.87751 2.11347 0.604755 3.78566 0.604755 9.48871C0.604755 16.2772 0.16219 24.7086 7.6878 26.4512C10.4042 27.079 12.7384 27.2139 14.6166 27.12C18.0237 26.9558 19.9354 26.0581 19.9354 26.0581L19.8214 23.893C19.8214 23.893 17.3867 24.5619 14.6501 24.4856C11.9404 24.4035 9.08456 24.2274 8.63998 21.3172V21.3173C8.59876 21.0469 8.5786 20.7744 8.57963 20.5017C14.3216 21.728 19.2179 21.0356 20.5658 20.8948C24.3289 20.5017 27.6066 18.4716 28.0243 16.6175C28.6815 13.6956 28.6278 9.48871 28.6278 9.48871V9.48871ZM23.5906 16.8346H20.4638V10.1341C20.4638 7.21805 16.1723 7.10657 16.1723 10.539V14.206H13.0656V10.5384C13.0656 7.10598 8.77409 7.21746 8.77409 10.1335V16.834H5.6406C5.6406 9.67001 5.29192 8.15623 6.87509 6.56619C8.61182 4.87053 12.2274 4.75905 13.8374 6.92409L14.6153 8.06822L15.3931 6.92409C17.0098 4.74731 20.6315 4.88226 22.3555 6.56619C23.9453 8.16797 23.5893 9.67587 23.5893 16.834L23.5906 16.8346Z"
                fill="url(#paint0_linear_186_1215)"
              />
              <defs>
                <linearGradient
                  id="paint0_linear_186_1215"
                  x1="24.4717"
                  y1="-2.42912"
                  x2="34.8097"
                  y2="25.8971"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#46BFEE" />
                  <stop offset="1" stopColor="#1ADACE" />
                </linearGradient>
              </defs>
            </svg>
          }
        />
        <Counter
          stats={stats.opreturnCount}
          icon={
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="28" height="28" fill="url(#pattern0)" />
              <defs>
                <pattern
                  id="pattern0"
                  patternContentUnits="objectBoundingBox"
                  width="1"
                  height="1"
                >
                  <use
                    xlinkHref="#image0_186_1224"
                    transform="scale(0.0208333)"
                  />
                </pattern>
                <image
                  id="image0_186_1224"
                  width="48"
                  height="48"
                  xlinkHref="data:image/png;base64,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"
                />
              </defs>
            </svg>
          }
        />
      </div>

      {/* <Stack

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
      </Stack> */}
      <SignTw popup={popupSignIn} />

      <TextField
        id="profile-basic"
        // label="Outlined"

        placeholder="Search by twitter name or public key on nostr"
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
          style: {
            borderRadius: '12px',
            borderBottomLeftRadius: '0px',
            borderBottomRightRadius: '0px',
            fontSize: '13px',
          },
          startAdornment: (
            <InputAdornment position="start">
              <IconButton
                aria-label="go to profile"
                disabled={!inputText}
                onClick={() => router.push(`/p/${inputText}`)}
              >
                <Search className={inputText && 'text-nostr-light'} />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="table tabs"
          variant="fullWidth"
          // className="!text-nostr-gradient"
          textColor="inherit"
          TabIndicatorProps={{
            style: {
              backgroundColor: '#1ADACE',
              color: '#1ADACE',
              // background: '#46BFEE',
              background: '#1ADACE',
            },
            // className: '!text-[#46BFEE]',
          }}
        >
          <Tab label="Popular on Twitter" />
          <Tab label="Donation Leaderboard" />
          <Tab label="Popular on Nostr" />
        </Tabs>
      </Box>
      <TabPanel value={tabValue} index={0}>
        <div style={{ height: '1200px', width: '100%' }}>
          <DataGrid
            disableColumnMenu
            disableColumnFilter
            sx={{
              'box-shadow': ' 0px 12px 40px rgba(69, 93, 101, 0.12)',
              borderTopLeftRadius: '0px',
              borderTopRightRadius: '0px',
              borderBottomLeftRadius: '12px',
              borderBottomRightRadius: '12px',
              '& .MuiDataGrid-virtualScroller': {
                overflowX: 'scroll',
                '&::-webkit-scrollbar': {
                  width: 0,
                },
              },
              '& .MuiDataGrid-iconButtonContainer': {
                display: 'none',
              },
              '& .css-yrdy0g-MuiDataGrid-columnHeaderRow': {
                background: '#DEF0EF1F',
              },
              '&.MuiDataGrid-root .MuiDataGrid-cell:focus, &.MuiDataGrid-root .MuiDataGrid-cell:focus-within':
                {
                  outline: 'none',
                },
              '&.MuiDataGrid-columnHeader:focus, &.css-anrt9z-MuiDataGrid-root .MuiDataGrid-cell:focus':
                {
                  outline: 'none !important',
                },
              '.MuiDataGrid-columnHeader:focus-within, &.MuiDataGrid-cell:focus-within':
                {
                  outline: 'none !important',
                },
              '& .MuiDataGrid-columnSeparator , .MuiDataGrid-columnSeparator--sideRight':
                {
                  opacity: '0 !important',
                },
            }}
            rows={row}
            columns={columns}
            pageSize={100}
            // rowsPerPageOptions={[50]}
            hideFooter
            loading={row.length === 0 && fetching}
            disableSelectionOnClick
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
      </TabPanel>
      {/* <TabPanel value={tabValue} index={1}>
        Item Two
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        Item Three
      </TabPanel> */}

      <Snackbar
        open={openToast}
        autoHideDuration={2000}
        message="Key copied"
        action={action}
        onClose={handleCloseToast}
      >
        <Alert
          onClose={handleCloseToast}
          severity="success"
          sx={{ width: '100%' }}
        >
          Key copied!
        </Alert>
      </Snackbar>
    </Section>
  );
};

export { List };
