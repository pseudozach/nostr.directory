import className from 'classnames';

type IButtonProps = {
  xl?: boolean;
  children: string;
};

const OutlinedButton = (props: IButtonProps) => {
  const btnClass = className({
    btn: true,
    'btn-xl': props.xl,
    'btn-base': !props.xl,
    'btn-two': true,
  });

  return (
    <div className={btnClass}>
      {props.children}

      <style jsx>
        {`
          .btn {
            @apply inline-block rounded-md text-center;
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
            @apply text-nostr-dark;
          }

          .btn-two:hover {
            @apply text-gray-600;
          }
        `}
      </style>
    </div>
  );
};

export { OutlinedButton };
