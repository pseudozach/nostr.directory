import { AppConfig } from '../utils/AppConfig';

const FooterCopyright = () => (
  <div className="footer-copyright">
    <img src="/assets/images/Icon.png" alt="nostr icon" />
    <p>
      <span>
        {new Date().getFullYear()} {AppConfig.site_name}
      </span>{' '}
      - Public domain
    </p>

    {/* Powered with{' '}
    <span role="img" aria-label="Love">
      ♥
    </span>{' '}
    by <a href="https://creativedesignsguru.com">CreativeDesignsGuru</a> */}
    <style jsx>
      {`
        .footer-copyright {
          display: flex;

          align-items: center;
          gap: 16px;
        }
        p {
          margin-top: 5px;
        }
        span {
          font-weight: 600;
        }
        .footer-copyright :global(a) {
          @apply text-primary-500;
        }

        .footer-copyright :global(a:hover) {
          @apply underline;
        }
        @media (min-width: 0) {
          .footer-copyright {
            flex-direction: column;
            margin-bottom: 20px;
          }
        }
        @media (min-width: 700px) {
          .footer-copyright {
            flex-direction: row;
          }
        }
      `}
    </style>
  </div>
);

export { FooterCopyright };
