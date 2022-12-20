import * as React from 'react';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';

import { OutlinedButton } from '../button/OutlinedButton';

type PopupProps = {
  buttonText: string;
  // contentText: string;
};

const verificationText = `@5e7ae588d7d11eac4c25906e6da807e68c6498f49a38e4692be5a089616ceb18 Verifying My Public Key: "Paste your twitter handle here"`;

export default function AlertDialog(props: PopupProps) {
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      {/* <Button variant="outlined" onClick={handleClickOpen}>
        {props.buttonText}
      </Button> */}
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
            <code className="break-all">{verificationText}</code>
            <br />
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
          <Button
            onClick={() => {
              navigator.clipboard.writeText(verificationText);
            }}
          >
            Copy
          </Button>
          <Button onClick={handleClose} autoFocus>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
