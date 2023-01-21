import React from 'react';

const SignTw = (props: any) => {
  return (
    <div>
      <p>
        To view and update your nostr contact list based on your twitter
        followers please sign in.
      </p>
      <button onClick={props.popupSignIn}>
        Sign in with Twitter <span />
      </button>

      <style jsx>{`
        div {
          margin-bottom: 20px;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          height: 52px;
          background: linear-gradient(
            158.74deg,
            rgba(70, 191, 238, 0.08) 14.86%,
            rgba(26, 218, 206, 0.08) 102.75%
          );
          border-radius: 12px;
          border: 1px solid #46bfee;
          padding: 15px 24px;
        }
        p {
          background: linear-gradient(
            158.74deg,
            #46bfee 14.86%,
            #1adace 102.75%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-fill-color: transparent;
          font-weight: 600;
          font-size: 14px;
        }
        button {
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
          z-index: 2;
          transition: all 0.3s;
          height: 36px;
        }
        button:hover {
          color: #27363a;
          background: #5f338414;
        }

        span {
          position: absolute;
          left: 0;
          top: -20px;
          width: 184px;
          height: 73px;
          background: url('/assets/images/stars.png');
          z-index: 1;
        }
      `}</style>
    </div>
  );
};

export default SignTw;
