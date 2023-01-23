import * as React from 'react';
import { useEffect, useState } from 'react';

import { Search, ContentCopyRounded } from '@mui/icons-material';
import { Stack, Tooltip } from '@mui/material';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import firebase from 'firebase/app';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { Section } from '../layout/Section';
import SignTw from '../signTw/signTw';
import { auth, db, twitterProvider } from '../utils/firebase';

const List = () => {
  const [row, setRow] = useState<Array<any>>([]);
  const [stats, setStats] = useState({
    tweetCount: 1000,
    verifiedCount: 100,
    donatedCount: 0,
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
    <Section
      mxWidth="max-w-screen-xl"
      yPadding="pt-0"
      title="Nostr Public Key Database"
      description={`Here is a list of ${stats.tweetCount!} twitter accounts that tweeted their nostr public keys. ${stats.verifiedCount!} verified those keys on nostr.`}
    >
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
              <Stack height="100%" alignItems="center" justifyContent="center">
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
    </Section>
  );
};

export { List };
