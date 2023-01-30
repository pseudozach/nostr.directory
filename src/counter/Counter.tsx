import React from 'react';

type CProps = {
  text?: string;
  stats?: any;
  icon?: any;
};

const Counter = (props: CProps) => {
  return (
    <div className="counter">
      {props.text && <p>{props.text}</p>}
      {props.icon && props.icon}
      <p className="stats">{props.stats}</p>
      <style jsx>{`
        .counter {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 8px 16px;
          width: 100px;
          height: 100px;
          justify-content: center;
          background: linear-gradient(
            180deg,
            #ffffff 0%,
            rgba(255, 255, 255, 0) 100%
          );
          border-radius: 12px;
          background: white;
          border: 1px solid #f5f6f6;
        }
        p {
          font-weight: 400;
          font-size: 14px;
          line-height: 17px;
          background: linear-gradient(
            158.74deg,
            #46bfee 14.86%,
            #1adace 102.75%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-fill-color: transparent;
        }
        .stats {
          font-weight: 700;
          font-size: 20px;
          line-height: 24px;
          background: linear-gradient(
            215.68deg,
            #385d95 -18.74%,
            #34385f 103.35%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-fill-color: transparent;
        }
      `}</style>
    </div>
  );
};

export default Counter;
