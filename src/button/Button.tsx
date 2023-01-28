import { ReactNode } from 'react';

import className from 'classnames';

type IButtonProps = {
  xl?: boolean;
  children: string;
  main?: boolean;
};

const Button = (props: IButtonProps) => {
  const btnClass = className({
    btn: true,
    'btn-xl': props.xl,
    'btn-2xl': props.main,
    'btn-base': !props.xl,
    'btn-primary': true,
  });

  return (
    <div className={btnClass}>
      {props.children}

      <style jsx>
        {`
          .btn {
            @apply inline-block rounded-md text-center m-1;
          }

          .btn-base {
            @apply text-lg font-semibold py-2 px-4;
          }

          .btn-xl {
            @apply font-extrabold text-xl py-4 px-6;
          }

          .btn-primary {
            @apply text-white bg-nostr-light cursor-pointer;
          }

          .btn-primary:hover {
            @apply bg-primary-600;
          }
          .btn-2xl {
            @apply bg-gradient-to-t from-[#5684C9] to-[#D3A7FF] text-xl py-2 px-6 text-base;
          }
          .btn-2xl:hover {
            @apply bg-gradient-to-t from-[#1d2d44] to-[#49236e];
          }
          @media (min-width: 0) {
            .btn-2xl {
              width: 300px;
            }
          }
          @media (min-width: 700px) {
            .btn-2xl {
              width: unset;
            }
          }
        `}
      </style>
    </div>
  );
};

export { Button };
