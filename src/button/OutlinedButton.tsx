import className from 'classnames';

type IButtonProps = {
  xl?: boolean;
  children: string;
  main?: boolean;
};

const OutlinedButton = (props: IButtonProps) => {
  const btnClass = className({
    btn: true,
    'btn-xl': props.xl,
    'btn-2xl': props.main,
    'btn-base': !props.xl,
    'btn-two': !props.main,
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
            @apply text-white bg-primary-500;
          }

          .btn-primary:hover {
            @apply bg-primary-600;
          }

          .btn-two {
            @apply text-nostr-dark border-2 border-nostr-dark;
          }

          .btn-two:hover {
            @apply text-gray-600 border-2 border-gray-600;
          }
          .btn-2xl {
            @apply text-nostr-solid-darker text-base  bg-[#EDF0F2];
          }
        `}
      </style>
    </div>
  );
};

export { OutlinedButton };
