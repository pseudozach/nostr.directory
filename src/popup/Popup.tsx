/* eslint-disable no-useless-escape */
import * as React from 'react';

import { TextField } from '@mui/material';
// import Button from '@mui/material/Button';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { sha256 } from '@noble/hashes/sha256';
import * as secp256k1 from '@noble/secp256k1';
import { initNostr, SendMsgType } from '@nostrgg/client';

import { Button } from '../button/Button';
import { OutlinedButton } from '../button/OutlinedButton';

const utf8Encoder = new TextEncoder();

export type NostrEvent = {
  id?: string;
  sig?: string;
  kind: number;
  tags: string[][];
  pubkey: string;
  content: string;
  created_at: number;
};

function serializeEvent(evt: NostrEvent): string {
  return JSON.stringify([
    0,
    evt.pubkey,
    evt.created_at,
    evt.kind,
    evt.tags,
    evt.content,
  ]);
}

function getEventHash(event: NostrEvent): string {
  const eventHash = sha256(utf8Encoder.encode(serializeEvent(event)));
  return secp256k1.utils.bytesToHex(eventHash);
}

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

// const verificationText = `@npub1teawtzxh6y02cnp9jphxm2q8u6xxfx85nguwg6ftuksgjctvavvqnsgq5u Verifying My Public Key: "Paste your twitter handle here"`;

interface CustomWindow extends Window {
  nostr?: any;
}
declare const window: CustomWindow;

export default function AlertDialog(props: PopupProps) {
  const [open, setOpen] = React.useState(false);
  const [twitterHandle, setTwitterHandle] = React.useState('');
  const [alertOpen, setAlertOpen] = React.useState(false);
  const [errorAlert, setErrorAlert] = React.useState({
    open: false,
    text: 'Error while doing stuff',
  });

  const signWithNip07 = async () => {
    if (!window.nostr) {
      // alert('You need to have a browser extension with nostr support!');
      setErrorAlert({
        open: true,
        text: 'You need to have a browser extension with nostr support!',
      });
      return;
    }

    if (!twitterHandle) {
      // alert('Please enter your twitter handle first!');
      setErrorAlert({
        open: true,
        text: 'Please enter your twitter handle first!',
      });
      return;
    }

    try {
      const content = `#[0] Verifying My Public Key: \"${twitterHandle}\"`;
      const pubkey = await window.nostr.getPublicKey();
      const unsignedEvent: any = {
        pubkey,
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
      unsignedEvent.id = getEventHash(unsignedEvent);
      // console.log('unsignedEvent ', unsignedEvent);

      const signedEvent = await window.nostr.signEvent(unsignedEvent);
      // console.log('signedEvent ', signedEvent);

      // publish to some relays via API
      initNostr({
        relayUrls: [
          'wss://nostr.zebedee.cloud',
          'wss://nostr-pub.wellorder.net',
          // 'wss://nostr-relay.wlvs.space',
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
        onError(relayUrl, err) {
          console.log('nostr error ', relayUrl, err);
        },
        debug: true, // Enable logs
      });
    } catch (error: any) {
      console.log('signWithNip07 error ', error.message);
    }
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

  return (
    <>
      <span onClick={handleClickOpen} className="cursor-pointer">
        <OutlinedButton main>{props.buttonText}</OutlinedButton>
      </span>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        fullWidth
        maxWidth="md"
      >
        <div className="titleContainer">
          <h2 id="alert-dialog-title">{props.buttonText}</h2>
          <svg
            style={{ cursor: 'pointer' }}
            onClick={() => {
              handleClose();
            }}
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              width="24"
              height="24"
              rx="12"
              fill="#1D4358"
              fillOpacity="0.08"
            />
            <path
              d="M16 8L8 16M8 8L16 16"
              stroke="#455D65"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <DialogContent className="rounded-3xl">
          <DialogContentText id="alert-dialog-description">
            {/* {props.contentText} */}
            <Typography className="mb-2">
              Send a note mentioning nostr.directory pubkey in the following
              format: {'\n'}
            </Typography>
            <div className="copyToClipboardContainer">
              <code>{`@npub1teawtzxh6y02cnp9jphxm2q8u6xxfx85nguwg6ftuksgjctvavvqnsgq5u Verifying My Public Key: "${
                twitterHandle || 'Your twitter handle here'
              }"`}</code>
              <button>Copy to clipboard</button>
            </div>
            <p>Twitter screen name</p>
            <TextField
              id="twitter-handle"
              className="!mt-4"
              required
              variant="outlined"
              placeholder="Example: John Doe"
              onChange={(event) => {
                setTwitterHandle(event.target.value);
              }}
              value={twitterHandle}
              fullWidth
            />
            <div className="mt-2 warningContainer">
              <svg
                width="40"
                height="40"
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
                Make sure you properly tag our pubkey (@5e7ae58...) with a{' '}
                <a
                  href="https://github.com/nostr-protocol/nips/blob/master/01.md#other-notes"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  p tag.
                </a>{' '}
                If you have a NIP-07 compliant extension like Alby or nos2x, you
                can sign and publish the note from here.
              </Typography>
            </div>
            <Typography className="mt-4">
              {'\n'}
              Here is a
              <a
                href="https://www.nostr.guru/e/1dee314c1431d48cf80cb3a439edcc0022ade22cc8b2ff5b8d1dd2c4db6fce22"
                target="_blank"
                rel="noreferrer"
                className="textLink"
              >
                {' '}
                sample note event on nostr.guru
              </a>{' '}
              for reference.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions className="mb-4">
          <div
            className="cursor-pointer"
            onClick={() => {
              navigator.clipboard.writeText(
                `@npub1teawtzxh6y02cnp9jphxm2q8u6xxfx85nguwg6ftuksgjctvavvqnsgq5u Verifying My Public Key: "${
                  twitterHandle || 'Your twitter handle here'
                }"`
              );
            }}
          >
            <button className="verification">Copy Verification Text</button>
          </div>

          <div className="cursor-pointer" onClick={signWithNip07}>
            <Button main>Sign with Extension</Button>
          </div>
        </DialogActions>
        <style jsx>{`
          .titleContainer {
            width: 100%;
            display: flex;
            flex-direction: row;
            padding: 16px 24px;
            border-bottom: 1px solid #def0ef;
            justify-content: space-between;
            align-items: center;
          }
          .titleContainer h2 {
            color: #27363a;
            font-weight: 800;
            font-size: 20px;
          }
          .copyToClipboardContainer {
            background: rgba(29, 67, 88, 0.08);
            border-radius: 8px;
            width: 100%;
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            gap: 8px;
          }
          button {
            padding: 8px 24px;
            gap: 8px;
            background: #ffffff;
            border-radius: 8px;
            max-width: 185px;
            flex: 1;
            font-weight: 600;
            font-size: 16px;
            color: #27363a;
          }
          .verification {
            background: #edf0f2;
            width: fit-content;
            max-width: unset;
            margin-right: 18px;
          }

          .copyToClipboardContainer code {
            flex: 1;
            overflow-wrap: anywhere;
          }
          p {
            font-weight: 700;
            font-size: 16px;
            margin-top: 16px;
            line-height: 21px;
            color: #455d65;
          }
          .warningContainer {
            display: flex;
            flex-direction: row;
            align-items: center;
            padding: 8px 16px;
            gap: 16px;
            background: #faf5f1;
            border-radius: 8px;
          }
          .textLink {
            background: linear-gradient(
                215.68deg,
                #5684c9 -18.74%,
                #d3a7ff 103.35%
              ),
              linear-gradient(0deg, #455d65, #455d65);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-fill-color: transparent;
          }
        `}</style>
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
      <Snackbar
        open={errorAlert.open}
        autoHideDuration={6000}
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
    </>
  );
}
