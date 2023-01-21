import { ReactNode } from 'react';

type IFooterIconListProps = {
  children: ReactNode;
};

const FooterIconList = (props: IFooterIconListProps) => (
  <div className="footer-icon-list flex flex-wrap">
    {props.children}

    <style jsx>
      {`
        .footer-icon-list a {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .footer-icon-list :global(a:not(:last-child)) {
          @apply mr-3;
        }

        .footer-icon-list :global(a) {
          @apply text-gray-500;
        }

        .footer-icon-list :global(a:hover) {
          @apply text-gray-700;
        }

        .footer-icon-list :global(svg) {
          @apply w-5 h-5;
        }
      `}
    </style>
  </div>
);

export { FooterIconList };
