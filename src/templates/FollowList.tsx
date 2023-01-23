import * as React from 'react';
import { useEffect, useState } from 'react';

import { ContentCopyRounded, Search } from '@mui/icons-material';
import TwitterIcon from '@mui/icons-material/Twitter';
import {
  Alert,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
import * as nostrTools from 'nostr-tools';

import DynamicButton from '../button/DynamicButton';
import { Section } from '../layout/Section';

interface CustomWindow extends Window {
  nostr?: any;
}
declare const window: CustomWindow;

const columns: GridColDef[] = [
  {
    field: 'profileImageUrl',
    headerName: '',
    maxWidth: 70,
    align: 'center',
    renderCell: (params: GridRenderCellParams) => <Avatar src={params.value} />,
  },
  {
    field: 'screenName',
    headerName: 'Twitter Account',
    maxWidth: 275,
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
    field: 'ProofUrl',
    headerName: 'Proof URL',
    headerAlign: 'center',
    maxWidth: 150,
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

const FollowList = () => {
  const [row, setRow] = useState<Array<any>>([]);
  const [selected, setSelected] = useState<Array<any>>([]);
  // const [stats, setStats] = useState({ tweetCount: 1000, verifiedCount: 100 });
  // const [searchText, setSearchText] = useState('');
  const [fetching, setFetching] = useState(false);
  const [alertOpen, setAlertOpen] = React.useState(false);
  const [inputText, setInputText] = useState('');
  const [errorAlert, setErrorAlert] = React.useState({
    open: false,
    text: 'Error while doing stuff',
  });
  const [relayConnection, setRelayConnection] = useState<nostrTools.Relay>();
  const [beforeContacts, setBeforeContacts] = useState<nostrTools.Event>();
  const [screenName, setScreenName] = useState('');
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
        // remove duplicate and add new element instead
        const removedArray = finalArray.filter((e: any) => e !== dupFound);
        removedArray.push(element);
        finalArray = removedArray;
      }
    }
    setRow(finalArray);
  };

  const handleAlertClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (event && reason === 'clickaway') {
      return;
    }

    setAlertOpen(false);
  };
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

  const fetchInitialData = async () => {
    console.log('getting follow list...');
    setRow([]);
    setFetching(true);
    try {
      // console.log('router.query ', router);
      const tmpScreenName = router.asPath
        .split('&')
        [router.asPath.split('&').length - 1]?.split('=')[1];
      if (tmpScreenName) setScreenName(tmpScreenName);

      const response = await axios.get(`/api${router.asPath}`);
      const idsArray = response.data;

      const rawArray: any[] = [];
      for (let index = 0; index < idsArray.length; index += 1) {
        const rowData = idsArray[index];
        if (!rowData.nPubKey && rowData.pubkey.includes('npub'))
          rowData.nPubKey = rowData.pubkey;
        if (
          !rowData.hexPubKey &&
          !rowData.pubkey.includes('npub') &&
          !rowData.pubkey.includes('nsec')
        )
          rowData.hexPubKey = rowData.pubkey;
        if (!rowData.nPubKey && !rowData.hexPubKey) return;

        rowData.id = rowData.hexPubKey || Math.floor(Math.random() * 10 ** 8);
        rowData.tweetId = rowData.id_str;
        rowData.url = rowData.entities?.urls[0]?.url || '';
        rawArray.push(rowData);
      }

      dedupArray(rawArray);

      // TODO: Should ignore the ones that are already on the contact list!
      // fetch nostr follow list and pre-mark the ones that are being followed or exclude them?

      try {
        if (!window.nostr) {
          // alert('You need to have a browser extension with nostr support!');
          setErrorAlert({
            open: true,
            text: 'You need to have a browser extension with nostr support in order to check your existing nostr contact list.',
          });
          return;
        }
        // first get existing followers of this user
        const pubkey = await window.nostr.getPublicKey();
        // console.log('got pubkey ', pubkey);
        // {"#p":[pubkey],kinds:[3]}

        const relay = nostrTools.relayInit(
          // 'wss://nostr-pub.wellorder.net'
          // 'wss://nostr.zebedee.cloud'
          // 'wss://nostr-2.zebedee.cloud'
          'wss://nostr-relay.wlvs.space'
          // 'wss://nostr.rocks'
        );
        setRelayConnection(relay);
        await relay.connect();

        relay.on('connect', () => {
          console.log(`connected to ${relay.url}`);

          const sub = relay.sub([
            {
              kinds: [3],
              authors: [pubkey],
              // since: 0,
            },
          ]);
          sub.on('event', async (event: any) => {
            // console.log('got event and setBeforeContacts:  ', event);
            setBeforeContacts(event);

            // mark these on the list?
            const onlyIds: string[] = [];
            event.tags.forEach((item: any) => {
              if (item[0] === 'p') onlyIds.push(item[1]);
            });
            // console.log('onlyIds -> selected for preselection ', onlyIds);
            setSelected(onlyIds);
            setFetching(false);
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
      } catch (error: any) {
        console.log('fetch contact list error ', error);
        setFetching(false);
        setErrorAlert({
          open: true,
          text: `fetch contact list error ${error}`,
        });
      }
    } catch (error: any) {
      console.log('fetchInitialData error ', error.message);
      setFetching(false);
      setErrorAlert({
        open: true,
        text: `fetchInitialData error ${error.message}`,
      });
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const bulkFollow = async () => {
    // console.log('bulkFollow this array: ', selected);

    if (selected.length === 0) {
      setErrorAlert({
        open: true,
        text: 'You did not select any new pubkeys to follow',
      });
      return;
    }
    if (!window.nostr) {
      // alert('You need to have a browser extension with nostr support!');
      setErrorAlert({
        open: true,
        text: 'You need to have a browser extension with nostr support!',
      });
      return;
    }

    try {
      // first get existing followers of this user - no we do that at initial
      const pubkey = await window.nostr.getPublicKey();
      // console.log('got pubkey, relayConnection ', pubkey, relayConnection);
      // {"#p":[pubkey],kinds:[3]}

      // Since we already pre-populated selected list, the final selected list should have all the contacts this account wants to have.
      // console.log('selected: ', selected);
      // console.log('nestedSelected ready: ', nestedSelected);
      // console.log('beforeContacts: ', beforeContacts);

      // branle merges it like this
      let tags = beforeContacts?.tags || [];
      // console.log('init tags: ', tags);

      // remove contacts that we're not following anymore
      tags = tags.filter(
        ([t, v]: Array<string>) => t === 'p' && selected.find((f) => f === v)
      );

      // copy even the comments from branle
      // now we merely add to the existing event because it might contain more data in the
      // tags that we don't want to replace
      selected.forEach((pk: string) => {
        if (!tags.find(([t, v]: Array<string>) => t === 'p' && v === pk)) {
          tags.push(['p', pk]);
        }
      });

      // await Promise.all(
      //   nestedSelected.map(async pubkey => {
      //     if (!tags.find(([t, v]) => t === 'p' && v === pubkey)) {
      //       tags.push(await getPubKeyTagWithRelay(pubkey))
      //     }
      //   })
      // )

      // console.log('final tags: ', tags);

      // add the new list and publish
      const updatedEvent: nostrTools.Event = {
        ...beforeContacts,
        kind: nostrTools.Kind.Contacts,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        pubkey,
        content: beforeContacts?.content || '',
      };

      updatedEvent.id = nostrTools.getEventHash(updatedEvent);
      // console.log('updatedEvent ', updatedEvent);

      const signedEvent = await window.nostr.signEvent(updatedEvent);
      // console.log('signedEvent ', signedEvent);

      if (relayConnection) {
        const pub = relayConnection.publish(signedEvent);
        pub.on('ok', (ev: any) => {
          console.log(`${relayConnection.url} has accepted our event `, ev);
        });
        pub.on('seen', (ev: any) => {
          console.log(`we saw the event on ${relayConnection.url} `, ev);
          setAlertOpen(true);
        });
        pub.on('failed', (reason: any) => {
          console.log(`failed to publish to ${relayConnection.url}: ${reason}`);
          setErrorAlert({
            open: true,
            text: `Failed to publish event with reason: ${reason}`,
          });
        });
      } else {
        throw new Error(
          'Failed to publish, lost relay connection. Refresh and try again.'
        );
      }
    } catch (error: any) {
      console.log('bulkFollow error ', error);
      setErrorAlert({
        open: true,
        text: `Some other error: ${JSON.stringify(error)}`,
      });
    }
  };

  return (
    <>
      <Section yPadding="pt-20 max-w-screen-xl">
        <h1 className="font-black text-[56px] text-nostr-solid-darker tracking-tight text-center leading-[68px]">
          Here are your follows, <span>@{screenName}</span>
        </h1>
        <p className="text-center font-medium	mt-4 mb-8 text-[22px] text-nostr-solid-darker max-w-2xl mx-auto">
          Here is a list of accounts you follow on twitter that are also on
          nostr. Select the ones you want to follow and update your contact
          list.
        </p>

        <Section mxWidth="max-w-screen-xl" yPadding="m-0">
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
          <div
            className="gridContainer"
            style={{ height: '800px', width: '100%' }}
          >
            <DataGrid
              disableColumnMenu
              disableColumnFilter
              sx={{
                // 'box-shadow': ' 0px 12px 40px rgba(69, 93, 101, 0.12)',
                borderRadius: 0,
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
              // hideFooter
              loading={row.length === 0 && fetching}
              disableSelectionOnClick
              disableColumnSelector
              disableDensitySelector
              checkboxSelection
              // onCellClick={(cellData) => {
              //   console.log('cellData ', cellData);
              //   navigator.clipboard.writeText(cellData.formattedValue || '');
              // }}
              selectionModel={selected}
              onSelectionModelChange={(newSelectionArray) => {
                // console.log('newSelectionArray: ', newSelectionArray);
                setSelected(newSelectionArray);
              }}
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
                // LoadingOverlay: LinearProgress,
              }}
            />
          </div>
          <div className="updateList" onClick={bulkFollow}>
            Follow accounts you selected on nostr{' '}
            <DynamicButton
              text={'Update list'}
              button_class={'bg-card-a bg-card-b'}
              variant={'roundUpdate'}
              href={''}
            />
          </div>
        </Section>
        <Section yPadding="mt-0" mxWidth="max-w-screen-xl">
          <div className="mt-2 warningContainer">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17.5099 3.85L11.5699 0.42C10.5999 -0.14 9.3999 -0.14 8.4199 0.42L2.48992 3.85C1.51992 4.41 0.919922 5.45 0.919922 6.58V13.42C0.919922 14.54 1.51992 15.58 2.48992 16.15L8.4299 19.58C9.3999 20.14 10.5999 20.14 11.5799 19.58L17.5199 16.15C18.4899 15.59 19.0899 14.55 19.0899 13.42V6.58C19.0799 5.45 18.4799 4.42 17.5099 3.85ZM9.2499 5.75C9.2499 5.34 9.5899 5 9.9999 5C10.4099 5 10.7499 5.34 10.7499 5.75V11C10.7499 11.41 10.4099 11.75 9.9999 11.75C9.5899 11.75 9.2499 11.41 9.2499 11V5.75ZM10.9199 14.63C10.8699 14.75 10.7999 14.86 10.7099 14.96C10.5199 15.15 10.2699 15.25 9.9999 15.25C9.8699 15.25 9.7399 15.22 9.6199 15.17C9.4899 15.12 9.3899 15.05 9.2899 14.96C9.1999 14.86 9.1299 14.75 9.0699 14.63C9.0199 14.51 8.9999 14.38 8.9999 14.25C8.9999 13.99 9.0999 13.73 9.2899 13.54C9.3899 13.45 9.4899 13.38 9.6199 13.33C9.9899 13.17 10.4299 13.26 10.7099 13.54C10.7999 13.64 10.8699 13.74 10.9199 13.87C10.9699 13.99 10.9999 14.12 10.9999 14.25C10.9999 14.38 10.9699 14.51 10.9199 14.63Z"
                fill="#B37F31"
              />
            </svg>
            <Typography className="text-[#b37f31]">
              <p>
                * Please <b>double-check your contact list</b> before publishing
                to make sure you dont lose any contacts.
                <br />* If you have more than 5000 follows on twitter, there may
                be accounts missing from this list.
              </p>
            </Typography>
          </div>
          {/* <Alert
            severity="warning"
            className="mt-4 items-center"
            // sx={{ width: '100%' }}
          >
            * Please <b>double-check your contact list</b> before publishing to
            make sure you dont lose any contacts.
            <br />* If you have more than 5000 follows on twitter, there may be
            accounts missing from this list.
          </Alert> */}
        </Section>
        <Snackbar
          open={alertOpen}
          autoHideDuration={10000}
          onClose={handleAlertClose}
        >
          <Alert
            onClose={handleAlertClose}
            severity="success"
            sx={{ width: '100%' }}
          >
            Contact List update published successfully...
          </Alert>
        </Snackbar>
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
      <style jsx>
        {`
          h1 span {
            background: linear-gradient(
                215.68deg,
                #5684c9 -18.74%,
                #d3a7ff 103.35%
              ),
              linear-gradient(0deg, #27363a, #27363a);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-fill-color: transparent;
          }
          .updateList {
            width: 100%;
            border-bottom-left-radius: 12px;
            border-bottom-right-radius: 12px;
            background-color: white;
            border: 1px solid rgba(224, 224, 224, 1);
            border-top: unset;
            font-weight: 500;
            font-size: 13px;
            display: flex;
            flex-direction: row;
            align-items: center;
            padding: 12px 32px;
            color: #27363a;
            justify-content: flex-end;
            gap: 12px;
          }
          .gridContainer {
            box-shadow: 0px 12px 40px rgba(69, 93, 101, 0.12);
          }
          .warningContainer {
            display: flex;
            flex-direction: row;
            align-items: center;
            padding: 8px 16px;
            gap: 16px;
            background: #faf5f1;
            border-radius: 8px;
            margin-top: 24px;
          }
          .warningContainer p {
            font-weight: 400;
            font-size: 13px;
          }
        `}
      </style>
    </>
  );
};

export { FollowList };
