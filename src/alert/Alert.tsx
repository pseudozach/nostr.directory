import { useState } from 'react';

import { Snackbar, Alert, AlertColor } from '@mui/material';

type IAlertProps = {
  text: string;
  severity: AlertColor;
  open: boolean;
};

const AlertSnackbar = (props: IAlertProps) => {
  const [alertOpen, setAlertOpen] = useState(props.open);

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
    <Snackbar
      open={alertOpen}
      autoHideDuration={6000}
      onClose={handleAlertClose}
    >
      <Alert
        onClose={handleAlertClose}
        severity={props.severity}
        sx={{ width: '100%' }}
      >
        {props.text}
      </Alert>
    </Snackbar>
  );
};

export { AlertSnackbar };
