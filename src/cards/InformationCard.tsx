import React from 'react';

import DynamicButton from '../button/DynamicButton';

type IProps = {
  class: string;
  title: string;
  description: string;
  extra?: string;
  button: string;
  button_class?: string | undefined;
  href?: string | undefined;
};
const InformationCard = (props: IProps) => {
  return (
    <div className={props.class}>
      <h3>{props.title}</h3>
      <p>{props.description}</p>
      <span>{props.extra}</span>
      <DynamicButton
        text={props.button}
        button_class={props.button_class}
        href={props.href}
      />
      <style jsx>{`
        div {
          display: flex;
          flex: 1;
          height: 232px;
          border-radius: 12px;
          position: relative;
          flex-direction: column;
          padding: 24px;
          z-index: 1;
          justify-content: space-between;
        }
        h3 {
          font-weight: 800;
          font-size: 20px;
          letter-spacing: -0.02em;
          color: #27363a;
        }
        p {
          font-weight: 400;
          font-size: 14px;

          color: #455d65;
        }
        .white-card {
          background: #ffffff;

          border: 1px solid #d3edeb;
        }
        .bg-card {
          overflow: hidden;
          background: radial-gradient(
            179.94% 436.2% at 50% 0%,
            rgba(86, 132, 201, 0) 0%,
            rgba(211, 167, 255, 0.06) 100%
          );

          border: 1px solid #5684c9;
           {
            /* border-image-source: linear-gradient(
              215.68deg,
              #5684c9 -18.74%,
              #d3a7ff 103.35%
            )
            1; */
          }
        }
        .bg-card h3 {
          color: #738cd6;
        }
        .bg-card p {
          color: #7e85ce;
        }
        .bg-card::before {
          content: '';
          background: url('/assets/images/circles.svg');
          background-position: right;
          background-repeat: no-repeat;
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          z-index: -1;
        }
        span {
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 0.02em;
          text-transform: uppercase;

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
      `}</style>
    </div>
  );
};

export default InformationCard;
