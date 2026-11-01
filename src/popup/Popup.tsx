import React from 'react';

import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';

import { IdentityEditor } from '../components/directory/IdentityEditor';

export default function Popup({ buttonText }: { buttonText: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        className="directory-action"
        type="button"
        onClick={() => setOpen(true)}
      >
        {buttonText}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="md"
        aria-labelledby="identity-dialog-title"
      >
        <DialogTitle id="identity-dialog-title">
          Public account links
        </DialogTitle>
        <DialogContent>
          <button type="button" onClick={() => setOpen(false)}>
            Close account editor
          </button>
          {open && <IdentityEditor />}
        </DialogContent>
      </Dialog>
    </>
  );
}
