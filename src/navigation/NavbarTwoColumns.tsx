import { ReactNode, useState } from 'react';

import { Dialog, DialogContent, DialogContentText } from '@mui/material';
import Link from 'next/link';

type INavbarProps = {
  logo: ReactNode;
  children: ReactNode;
};

const NavbarTwoColumns = (props: INavbarProps) => {
  const [dialog, setDialog] = useState({
    open: false,

    text: <></>,
  });
  const handleClose = () => {
    setDialog({
      ...dialog,
      open: false,
    });
  };

  return (
    <header className="flex flex-wrap justify-between items-center relative">
      <div>
        <Link href="/">
          <a>{props.logo}</a>
        </Link>
      </div>

      <nav>
        <ul className="navbar flex items-center font-medium text-base gap-5">
          {props.children}
        </ul>
      </nav>
      <div
        onClick={() => {
          setDialog({
            open: true,

            text: (
              <p>
                Web of Trust score for the user is calculated as 10 points per
                badge at the moment. <br />
                We are looking for feedback on a WoT scheme where users sign
                messages with their keys to signal how trusted their connections
                are. <br />
                Current plan is to implement{' '}
                <a
                  href="https://github.com/nostr-protocol/nostr/issues/20#issuecomment-913027389"
                  target={'_blank'}
                  rel="noreferrer"
                  className="!underline"
                >
                  this scheme by fiatjaf.
                </a>
              </p>
            ),
          });
        }}
        className="hamburger"
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7 16H19M7 10H25M7 22H25"
            stroke="url(#paint0_linear_43_3549)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient
              id="paint0_linear_43_3549"
              x1="25.0211"
              y1="6.14634"
              x2="15.2197"
              y2="26.6248"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#385D95" />
              <stop offset="1" stopColor="#34385F" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {/* <nav className="menu">
        <ul className="navbar flex-col flex items-center font-medium text-base gap-5 text-gray-800 ">
          {props.children}
        </ul>
      </nav> */}

      <Dialog
        open={dialog.open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        fullWidth
        PaperProps={{
          style: {
            position: 'absolute',
            top: '-15px',
            background: 'white',
            boxShadow: '0px 12px 40px rgba(69, 93, 101, 0.12)',
            borderRadius: '12px',
            display: 'flex',
            gap: '6px',
            padding: ' 16px',
            width: '370px',
          },
        }}
      >
        <DialogContent sx={{ padding: 0 }}>
          <DialogContentText
            id="alert-dialog-description"
            className="flex justify-center"
            sx={{
              color: 'white',
              fontWeight: 400,
              fontSize: '13px',

              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <ul className="navbar flex-col flex items-center font-medium text-base gap-5 text-gray-800 ">
              {props.children}
            </ul>
          </DialogContentText>
        </DialogContent>
        {/* <DialogActions>
            {dialog.button1 && dialog.button1}

            <div className="cursor-pointer">
              <Button onClick={handleClose}>{dialog.button2}</Button>
            </div>
          </DialogActions> */}
      </Dialog>

      <style jsx>
        {`
          @media (min-width: 0) {
            nav {
              display: none;
            }
            .hamburger {
              display: block;
            }
            .menu {
              display: block;
              top: 0;
              position: absolute;
              width: 100%;
              background: #ffffff;
              box-shadow: 0px 12px 40px rgba(69, 93, 101, 0.12);
              border-radius: 12px;
              padding: 32px 16px;
            }
          }
          @media (min-width: 700px) {
            nav {
              display: block;
            }
            .hamburger {
              display: none;
            }
          }

          .navbar :global(li:not(:first-child)) {
            @apply mt-0;
          }

          .navbar :global(li:not(:last-child)) {
            @apply mr-5;
          }
        `}
      </style>
    </header>
  );
};

export { NavbarTwoColumns };
