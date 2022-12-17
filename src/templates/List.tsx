import { useEffect, useState } from 'react';

import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TwitterIcon from '@mui/icons-material/Twitter';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridToolbar,
} from '@mui/x-data-grid';

import { Background } from '../background/Background';
import { Section } from '../layout/Section';
import db from '../utils/firebase';

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
  {
    field: 'isValid',
    headerName: 'valid?',
    headerAlign: 'center',
    maxWidth: 100,
    flex: 1,
    align: 'center',
    renderCell: (params: GridRenderCellParams) =>
      params.value ? (
        <CheckCircleIcon htmlColor="green" />
      ) : (
        <CancelIcon htmlColor="red" />
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
  const [row, setRow] = useState<
    Array<{
      id: string;
      screenName: string;
      pubkey: string;
      profileImageUrl: string;
      tweetId: string;
      createdAt: number;
      url: string;
    }>
  >([]);

  useEffect(() => {
    const fetchData = async () => {
      const querySnapshot = await db.collection('twitter').get();
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
        setRow((r) => [
          ...r,
          {
            id: doc.id,
            isValid: rowData.isValid,
            screenName: rowData.screenName,
            pubkey: rowData.pubkey,
            nPubKey: rowData.nPubKey,
            hexPubKey: rowData.hexPubKey,
            profileImageUrl: rowData.profileImageUrl,
            tweetId: rowData.id_str,
            createdAt: rowData.createdAt,
            url: rowData.entities?.urls[0]?.url || '',
          },
        ]);
      });
    };
    fetchData();
  }, []);

  return (
    <Background color="bg-gray-100">
      <Section
        title="Nostr Public Keys"
        description="Here is a list of twitter accounts that tweeted their nostr public keys"
      >
        <div style={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={row}
            columns={columns}
            pageSize={100}
            rowsPerPageOptions={[50]}
            loading={row.length === 0}
            disableSelectionOnClick
            disableColumnFilter
            disableColumnSelector
            disableDensitySelector
            components={{ Toolbar: GridToolbar }}
            componentsProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 },
              },
            }}
          />
        </div>
      </Section>
    </Background>
  );
};

export { List };
