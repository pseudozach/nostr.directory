import * as React from 'react';
import { useEffect, useState } from 'react';

import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TwitterIcon from '@mui/icons-material/Twitter';
import { Alert, Snackbar, Stack, Tooltip } from '@mui/material';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
import * as nostrTools from 'nostr-tools';

import { Background } from '../background/Background';
import { Button } from '../button/Button';
import { Section } from '../layout/Section';

interface CustomWindow extends Window {
  nostr?: any;
}
declare const window: CustomWindow;

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

const FollowList = () => {
  const [row, setRow] = useState<Array<any>>([]);
  const [selected, setSelected] = useState<Array<any>>([]);
  // const [stats, setStats] = useState({ tweetCount: 1000, verifiedCount: 100 });
  // const [searchText, setSearchText] = useState('');
  const [fetching, setFetching] = useState(false);
  const [alertOpen, setAlertOpen] = React.useState(false);
  const [errorAlert, setErrorAlert] = React.useState({
    open: false,
    text: 'Error while doing stuff',
  });
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

        rowData.id = rowData.hexPubKey;
        rowData.tweetId = rowData.id_str;
        rowData.url = rowData.entities?.urls[0]?.url || '';
        rawArray.push(rowData);
      }

      dedupArray(rawArray);
      setFetching(false);

      // TODO: Should ignore the ones that are already on the contact list!
      // fetch nostr follow list and pre-mark the ones that are being followed or exclude them?
    } catch (error: any) {
      console.log('error ', error.message);
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
      // first get existing followers of this user
      const pubkey = await window.nostr.getPublicKey();
      console.log('got pubkey ', pubkey);
      // {"#p":[pubkey],kinds:[3]}

      const relay = nostrTools.relayInit(
        // 'wss://nostr-pub.wellorder.net'
        // 'wss://nostr.zebedee.cloud'
        'wss://nostr-2.zebedee.cloud'
        // 'wss://nostr-relay.wlvs.space'
        // 'wss://nostr.rocks'
      );
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
          console.log('got event ', event);
          // TODO: Should ignore the ones that are already on the list!

          // prepare updated follow/contact list
          const nestedSelected: any[] = [];
          selected.forEach((pk: string) => {
            nestedSelected.push('p', pk);
          });
          // add the new list and publish
          const updatedEvent = {
            ...event,
            created_at: Math.floor(Date.now() / 1000),
            tags: [...event.tags, nestedSelected],
          };

          updatedEvent.id = nostrTools.getEventHash(updatedEvent);
          // console.log('updatedEvent ', updatedEvent);

          const signedEvent = await window.nostr.signEvent(updatedEvent);
          console.log('signedEvent ', signedEvent);

          const pub = relay.publish(event);
          pub.on('ok', (ev: any) => {
            console.log(`${relay.url} has accepted our event `, ev);
          });
          pub.on('seen', (ev: any) => {
            console.log(`we saw the event on ${relay.url} `, ev);
            setAlertOpen(true);
          });
          pub.on('failed', (reason: any) => {
            console.log(`failed to publish to ${relay.url}: ${reason}`);
            setErrorAlert({
              open: true,
              text: `Failed to publish event with reason: ${reason}`,
            });
          });
        });
        sub.on('eose', async () => {
          // console.log('eose');
          sub.unsub();
          // await relay.close();
        });
      });
      relay.on('error', () => {
        console.log(`failed to connect to ${relay.url}`);
      });
    } catch (error: any) {
      console.log('signWithNip07 error ', error);
    }
  };

  return (
    <Background color="bg-gray-100">
      <Section
        title="Your twitter follows on nostr"
        description={`Here is a list of accounts you follow on twitter that are also on nostr. Select the ones you want to follow and update your contact list.`}
      >
        <div style={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={row}
            columns={columns}
            pageSize={100}
            // rowsPerPageOptions={[50]}
            // hideFooter
            loading={row.length === 0 && fetching}
            disableSelectionOnClick
            disableColumnFilter
            disableColumnSelector
            disableDensitySelector
            checkboxSelection
            // onCellClick={(cellData) => {
            //   console.log('cellData ', cellData);
            //   navigator.clipboard.writeText(cellData.formattedValue || '');
            // }}
            onSelectionModelChange={(newSelectionArray) => {
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
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            marginTop: 4,
          }}
          className="text-xl"
          onClick={bulkFollow}
        >
          Follow accounts you selected on{' '}
          <span className="text-nostr-darker ml-1"> nostr</span>:{' '}
          <Button xl>Update contact list</Button>
        </div>
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
    </Background>
  );
};

export { FollowList };
