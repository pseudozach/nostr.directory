import { useEffect, useState } from 'react';

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
    field: 'pubkey',
    headerName: 'Nostr PubKey',
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
      // <a href={params.value} target="_blank" rel="noreferrer">
      //   <TwitterIcon />
      // </a>
    ),
  },
  {
    field: 'url',
    headerName: 'Proof URL',
    maxWidth: 100,
    flex: 1,
    align: 'center',
    renderCell: (params: GridRenderCellParams) => (
      <a href={params.value} target="_blank" rel="noreferrer">
        <TwitterIcon />
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
        setRow((r) => [
          ...r,
          {
            id: doc.id,
            screenName: rowData.screenName,
            pubkey: rowData.pubkey,
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
