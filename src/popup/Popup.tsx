/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-useless-escape */
import * as React from 'react';

import { TextField } from '@mui/material';
// import Button from '@mui/material/Button';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { initNostr, SendMsgType } from '@nostrgg/client';

import { Button } from '../button/Button';
import { OutlinedButton } from '../button/OutlinedButton';

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

type PopupProps = {
  buttonText: string;
  // contentText: string;
};

// const verificationText = `@5e7ae588d7d11eac4c25906e6da807e68c6498f49a38e4692be5a089616ceb18 Verifying My Public Key: "Paste your twitter handle here"`;

interface customWindow extends Window {
  nostr?: any;
}
declare const window: customWindow;

export default function AlertDialog(props: PopupProps) {
  const [open, setOpen] = React.useState(false);
  const [twitterHandle, setTwitterHandle] = React.useState('');
  const [alertOpen, setAlertOpen] = React.useState(false);

  const signWithNip07 = async () => {
    if (!window.nostr) return;

    if (!twitterHandle) {
      alert('Please enter your twitter handle first');
      return;
    }

    const content = `#[0] Verifying My Public Key: \"${twitterHandle}\"`;
    // const pubkey = await window.nostr.getPublicKey();
    const unsignedEvent: any = {
      // pubkey,
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [
        [
          'p',
          '5e7ae588d7d11eac4c25906e6da807e68c6498f49a38e4692be5a089616ceb18',
        ],
      ],
      content,
    };
    // event.id = getEventHash(event);
    const signedEvent = await window.nostr.signEvent(unsignedEvent);
    // console.log('signedEvent ', signedEvent);

    // publish to some relays via API
    initNostr({
      relayUrls: [
        'wss://nostr.zebedee.cloud',
        'wss://nostr-relay.wlvs.space',
        // 'wss://nostr-relay.untethr.me',
      ],
      onConnect: (relayUrl, sendEvent) => {
        console.log(
          'Nostr connected to:',
          relayUrl,
          // sendEvent,
          'sending signedEvent ',
          signedEvent
        );

        // Send a REQ event to start listening to events from that relayer:
        sendEvent([SendMsgType.EVENT, signedEvent], relayUrl);
      },
      onEvent: (relayUrl: any, event: any) => {
        console.log('Nostr received event:', relayUrl, event);
        setAlertOpen(true);
      },
      debug: true, // Enable logs
    });
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
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

  return (
    <>
      <span onClick={handleClickOpen} className="cursor-pointer">
        <OutlinedButton xl>{props.buttonText}</OutlinedButton>
      </span>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        fullWidth
      >
        <DialogTitle id="alert-dialog-title">{props.buttonText}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {/* {props.contentText} */}
            <Typography className="mt-4">
              Send a note mentioning nostr.directory pubkey in the following
              format: {'\n'}
            </Typography>
            <br />
            <code className="break-all mb-4">{`@5e7ae588d7d11eac4c25906e6da807e68c6498f49a38e4692be5a089616ceb18 Verifying My Public Key: "${
              twitterHandle || 'Your twitter handle here'
            }"`}</code>
            <br />
            <TextField
              id="twitter-handle"
              className="!mt-4"
              required
              label="Twitter Screen Name"
              variant="outlined"
              placeholder="fiatjaf"
              onChange={(event) => {
                setTwitterHandle(event.target.value);
              }}
              value={twitterHandle}
              fullWidth
            />
            <div className="mt-4">
              <Typography className="mt-4">
                If you have a NIP-07 compliant extension like Alby or nos2x, you
                can sign and publish the note from here.
              </Typography>

              <div className="flex w-full items-center"></div>
            </div>
            <Typography className="mt-4">
              {'\n'}
              Here is a
              <a
                href="https://www.nostr.guru/e/1dee314c1431d48cf80cb3a439edcc0022ade22cc8b2ff5b8d1dd2c4db6fce22"
                target="_blank"
                rel="noreferrer"
                className="text-nostr-light"
              >
                {' '}
                sample note event on nostr.guru
              </a>{' '}
              for reference.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <div
            className="cursor-pointer"
            onClick={() => {
              navigator.clipboard.writeText(
                `@5e7ae588d7d11eac4c25906e6da807e68c6498f49a38e4692be5a089616ceb18 Verifying My Public Key: "${
                  twitterHandle || 'Your twitter handle here'
                }"`
              );
            }}
          >
            <OutlinedButton>Copy Verification Text</OutlinedButton>
          </div>

          <div className="cursor-pointer" onClick={signWithNip07}>
            <Button>Sign with Extension</Button>
          </div>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={alertOpen}
        autoHideDuration={6000}
        onClose={handleAlertClose}
      >
        <Alert
          onClose={handleAlertClose}
          severity="success"
          sx={{ width: '100%' }}
        >
          Note published successfully...
        </Alert>
      </Snackbar>
    </>
  );
}
