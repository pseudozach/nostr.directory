import * as React from 'react';
import { useEffect, useState } from 'react';

import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ClearSharpIcon from '@mui/icons-material/ClearSharp';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SearchSharpIcon from '@mui/icons-material/SearchSharp';
import TwitterIcon from '@mui/icons-material/Twitter';
import { Stack, Tooltip } from '@mui/material';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import algoliasearch from 'algoliasearch/lite';
import Link from 'next/link';

import { Background } from '../background/Background';
import { Button as PrimaryButton } from '../button/Button';
import { Section } from '../layout/Section';
import { db } from '../utils/firebase';

const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_API_KEY!
);
const searchIndex = searchClient.initIndex('twitter');

const columns: GridColDef[] = [
  {
    field: 'profileImageUrl',
    headerName: '',
    maxWidth: 50,
    align: 'center',
    renderCell: (params: GridRenderCellParams) => (
      <Avatar alt="profile picture" src={params.value} />
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
    headerName: 'NIP19 PubKey',
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
  {
    field: 'url',
    headerName: 'Proof URL',
    headerAlign: 'center',
    maxWidth: 100,
    flex: 1,
    align: 'center',
    renderCell: (params: GridRenderCellParams) => (
      <a href={params.value} target="_blank" rel="noreferrer">
        <TwitterIcon htmlColor="#1DA1F2" />
      </a>
    ),
  },
  // { field: 'createdAt', headerName: 'createdAt', width: 150 },
];

const List = () => {
  const [row, setRow] = useState<Array<any>>([]);
  const [stats, setStats] = useState({ tweetCount: 1000, verifiedCount: 100 });
  const [searchText, setSearchText] = useState('');
  const [fetching, setFetching] = useState(false);

  const dedupArray = (rawArray: any) => {
    const finalArray: any = [];
    for (let index = 0; index < rawArray.length; index += 1) {
      const element = rawArray[index];
      const dupFound = finalArray.find(
        (r: any) =>
          // should also check and prefer the row with verified
          r.hexPubKey === element.hexPubKey &&
          r.screenName === element.screenName
      );
      if (dupFound) {
        break;
      }
      finalArray.push(element);
    }
    setRow(finalArray);
  };

  // const dedupSet = (rowData: any) => {
  //   // ignore duplicate hexPubKeys
  //   console.log('comparing rowData.hexPubKey ', rowData.hexPubKey, ' to ', row);
  //   for (let index = 0; index < row.length; index += 1) {
  //     const element = row[index];
  //     console.log('element? ', element);
  //   }
  //   const dup = row.filter((r) => r.hexPubKey === rowData.hexPubKey);
  //   console.log('dup ', dup);
  //   if (dup.length) {
  //     console.log('dup found ', dup);
  //     return;
  //   }

  //   // if (trimmed && !row.includes(trimmed)) {
  //   //   setCategories((prevState) => prevState.concat(trimmed));
  //   // }

  //   setRow((r) => [
  //     ...r,
  //     {
  //       id: rowData.id,
  //       isValid: rowData.isValid,
  //       screenName: rowData.screenName,
  //       pubkey: rowData.pubkey,
  //       nPubKey: rowData.nPubKey,
  //       hexPubKey: rowData.hexPubKey,
  //       profileImageUrl: rowData.profileImageUrl,
  //       tweetId: rowData.id_str,
  //       createdAt: rowData.createdAt,
  //       url: rowData.entities?.urls[0]?.url || '',
  //       verified: rowData.verified,
  //       verifyEvent: rowData.verifyEvent,
  //     },
  //   ]);
  // };

  const fetchInitialData = async () => {
    console.log('getting latest records...');
    setRow([]);
    setFetching(true);
    const querySnapshot = await db
      .collection('twitter')
      .orderBy('createdAt', 'desc')
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
      rawArray.push(rowData);
    });
    dedupArray(rawArray);
    setFetching(false);
  };

  const handleChange = async () => {
    if (searchText.length === 0 && row.length === 0) {
      fetchInitialData();
      return;
    }
    if (searchText.length < 2) {
      // console.log('return short query');
      return;
    }
    setFetching(true);
    setRow([]);
    // console.log('searching records for ', searchText);
    const { hits } = await searchIndex.search(searchText, {
      hitsPerPage: 10,
    });
    const rawArray = [];
    for (let index = 0; index < hits.length; index += 1) {
      const rowData: any = hits[index];
      rowData.id = rowData.objectID;
      rowData.tweetId = rowData.id_str;
      rowData.url = `https://twitter.com/i/web/status/${rowData.id_str}`;
      rawArray.push(rowData);

      // setRow((r) => [
      //   ...r,
      //   {
      //     id: rowData.objectID,
      //     isValid: rowData.isValid,
      //     screenName: rowData.screenName,
      //     pubkey: rowData?.pubkey,
      //     nPubKey: rowData?.nPubKey,
      //     hexPubKey: rowData?.hexPubKey,
      //     profileImageUrl: rowData.profileImageUrl,
      //     tweetId: rowData.id_str,
      //     createdAt: rowData.createdAt,
      //     url: `https://twitter.com/i/web/status/${rowData.id_str}`,
      //     verified: rowData.verified,
      //     verifyEvent: rowData.verifyEvent,
      //   },
      // ]);
    }
    dedupArray(rawArray);
    setFetching(false);
    // console.log('hits ', hits.length);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const statsRef = await db.collection('stats').doc('data').get();
      const statsData: any = statsRef.data();
      // console.log('got statsData ', statsData);
      setStats(statsData);
    };
    fetchData();
  }, []);

  const clearSearchField = () => {
    // console.log('delete text - reset data');
    setRow([]);
    setSearchText('');
  };

  useEffect(() => {
    handleChange();
  }, [searchText]);

  const popupSignIn = async () => {
    // auth
    //   .signInWithPopup(twitterProvider)
    //   .then((result) => {
    //     /** @type {firebase.auth.OAuthCredential} */
    //     const { credential } = result;
    //     // This gives you a the Twitter OAuth 1.0 Access Token and Secret.
    //     // You can use these server side with your app's credentials to access the Twitter API.
    //     const token = credential.accessToken!;
    //     const { secret } = credential;
    //     // The signed-in user info.
    //     const { user } = result;
    //     // ...
    //     console.log('logged in ', token, secret, user);
    //   })
    //   .catch((error) => {
    //     // Handle Errors here.
    //     const errorCode = error.code;
    //     const errorMessage = error.message;
    //     // The email of the user's account used.
    //     const { email } = error;
    //     // The firebase.auth.AuthCredential type that was used.
    //     const { credential } = error;
    //     // ...
    //     console.log(
    //       'signin error ',
    //       errorCode,
    //       errorMessage,
    //       email,
    //       credential
    //     );
    //   });
  };

  return (
    <Background color="bg-gray-100">
      <Section
        title="Nostr Public Keys"
        description={`Here is a list of ${stats.tweetCount!} twitter accounts that tweeted their nostr public keys. ${stats.verifiedCount!} verified those keys on nostr.`}
      >
        <div style={{ display: 'flex' }} onClick={popupSignIn}>
          To see a list of your follows that are on nostr:{' '}
          <PrimaryButton xl>Sign in with Twitter</PrimaryButton>
        </div>
        <TextField
          id="outlined-basic"
          // label="Outlined"
          variant="outlined"
          placeholder="Search by twitter screen name or pubkey"
          // onChange={handleChange}
          onChange={(event) => {
            setSearchText(event.target.value);
          }}
          value={searchText}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchSharpIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="start">
                <IconButton
                  aria-label="clear search"
                  onClick={clearSearchField}
                >
                  <ClearSharpIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

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
      </Section>
    </Background>
  );
};

export { List };
