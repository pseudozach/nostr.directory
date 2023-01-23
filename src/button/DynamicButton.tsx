import React from 'react';

import NorthEastIcon from '@mui/icons-material/NorthEast';

type IProps = {
  text: string;
  href: string;
  button_class?: string | undefined;
  variant?: string;
};

const DynamicButton = (props: IProps) => {
  return (
    <a href="" className={props.button_class}>
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
          padding: 8px 24px;
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
      `}</style>
    </a>
  );
};

export default DynamicButton;
