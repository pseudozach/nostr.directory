import React from 'react';

import NorthEastIcon from '@mui/icons-material/NorthEast';
import { useRouter } from 'next/router';

type IProps = {
  text: string;
  href?: string | undefined;
  button_class?: string | undefined;
  variant?: string;
};

const DynamicButton = (props: IProps) => {
  const router = useRouter();
  return (
    <a
      href={props.href}
      className={props.button_class}
      onClick={() => {
        if (props.text === 'Go back') {
          router.back();
        }
      }}
    >
      {props.text === 'Go back' && (
        <svg
          width="12"
          height="10"
          viewBox="0 0 12 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11.3332 5H0.666504M0.666504 5L4.6665 9M0.666504 5L4.6665 1"
            stroke="#27363A"
            strokeWidth="1.33333"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {props.text}
      {props.variant !== 'roundUpdate' && (
        <NorthEastIcon sx={{ width: '17px' }} />
      )}

      <style jsx>{`
        a {
          display: flex;
          position: relative;
          font-weight: 500;
          font-size: 13px;
          color: white;
          border-radius: 8px;
          cursor: pointer;
          background: linear-gradient(
            158.74deg,
            #46bfee 14.86%,
            #1adace 102.75%
          );
          border-radius: 8px;
          z-index: 0;
          height: 36px;
          width: fit-content;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          transition: all 0.3s;
        }
        @media (min-width: 0) {
          a {
            padding: 8px;
          }
        }
        @media (min-width: 700px) {
          a {
            padding: 8px 24px;
          }
        }
        svg {
          width: 10px;
        }
        a:hover {
          background: #5f338414;
          color: black;
        }
        .bg-card-a {
          background: linear-gradient(
            215.68deg,
            #5684c9 -18.74%,
            #d3a7ff 103.35%
          );
        }
        .bg-card-b {
          height: 32px;
          border-radius: 24px;
        }
        .absolute {
          position: absolute;
          top: 40px;
          left: 40px;
          background: linear-gradient(95.09deg, #bdb0de 0%, #e7e2f3 100%);
          border-radius: 56px;
          color: #27363a;
        }
        @media (min-width: 0) {
          .absolute {
            left: 16px;
          }
        }
        @media (min-width: 700px) {
          .absolute {
            left: 40px;
          }
        }
      `}</style>
    </a>
  );
};

export default DynamicButton;
