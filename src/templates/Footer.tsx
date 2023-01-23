import Image from 'next/image';
import Link from 'next/link';

import { FooterCopyright } from '../footer/FooterCopyright';

const Footer = () => (
  <footer>
    <div className="max-w-screen-xl mx-auto px-3 py-6 container">
      <div className=" text-sm">
        <FooterCopyright />
      </div>
      <div className="icon-list">
        <>
          <Link href="https://www.nostr.guru/p/5e7ae588d7d11eac4c25906e6da807e68c6498f49a38e4692be5a089616ceb18">
            <a target="_blank">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="2"
                  y="2"
                  width="20"
                  height="20"
                  rx="5"
                  fill="#182029"
                />
                <rect x="2" y="8" width="20" height="4" fill="#87C7F4" />
              </svg>

              {/* <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.199 24C19.199 13.467 10.533 4.8 0 4.8V0c13.165 0 24 10.835 24 24h-4.801zM3.291 17.415a3.3 3.3 0 013.293 3.295A3.303 3.303 0 013.283 24C1.47 24 0 22.526 0 20.71s1.475-3.294 3.291-3.295zM15.909 24h-4.665c0-6.169-5.075-11.245-11.244-11.245V8.09c8.727 0 15.909 7.184 15.909 15.91z" />
                </svg> */}
            </a>
          </Link>

          <Link href="https://github.com/pseudozach/nostr.directory">
            <a target="_blank">
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13.2039 20.547C13.2039 20.7971 13.4028 20.9999 13.6482 20.9999C13.6903 20.9999 13.7322 20.9938 13.7726 20.9818C19.0774 19.4211 22.1365 13.7729 20.6053 8.36619C19.074 2.95948 13.5322 -0.158348 8.22739 1.40233C2.92255 2.96301 -0.136521 8.6112 1.39474 14.0179C2.34733 17.3813 4.92732 20.0109 8.22738 20.9818C8.46296 21.0518 8.70964 20.9139 8.77835 20.6738C8.79014 20.6326 8.79612 20.5899 8.79612 20.547V18.4186C7.53069 18.8082 6.18653 18.1252 5.73025 16.8607C5.48183 16.0899 5.0691 15.3847 4.52167 14.7957C7.05435 15.4206 7.09878 17.0962 8.82278 16.3082C8.87489 15.7205 9.06708 15.1546 9.38264 14.6598C7.42759 14.4334 5.3659 14.1164 5.3659 10.6746C5.34893 9.78526 5.66695 8.92308 6.25456 8.26538C5.9869 7.49166 6.01868 6.64305 6.34342 5.89238C6.34342 5.89238 7.08101 5.64783 8.76946 6.7981C10.2233 6.38882 11.7589 6.38882 13.2128 6.7981C14.8923 5.63878 15.6299 5.89238 15.6299 5.89238C15.9547 6.64305 15.9864 7.49166 15.7188 8.26538C16.3072 8.92259 16.6253 9.7851 16.6074 10.6746C16.6074 14.1254 14.5457 14.4334 12.5818 14.6507C13.0024 15.2688 13.2145 16.0095 13.1861 16.7611L13.2039 20.547Z"
                  stroke="#455D65"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </Link>

          {/* <Link href="/">
              <a>
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23.998 12c0-6.628-5.372-12-11.999-12C5.372 0 0 5.372 0 12c0 5.988 4.388 10.952 10.124 11.852v-8.384H7.078v-3.469h3.046V9.356c0-3.008 1.792-4.669 4.532-4.669 1.313 0 2.686.234 2.686.234v2.953H15.83c-1.49 0-1.955.925-1.955 1.874V12h3.328l-.532 3.469h-2.796v8.384c5.736-.9 10.124-5.864 10.124-11.853z" />
                </svg>
              </a>
            </Link> */}

          <Link href="https://twitter.com/nostrdirectory">
            <a target="_blank">
              <svg
                width="22"
                height="18"
                viewBox="0 0 22 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21 4.26751L19.1208 3.46182L20.1051 1.31332L17.8143 2.07425L17.8143 2.07425C17.0847 1.39383 16.1272 1.01069 15.1298 1V1C12.9078 1.00492 11.1078 2.80564 11.1029 5.02844V5.92365C7.93512 6.57715 5.17002 4.8494 2.60179 1.89521C2.15436 4.28244 2.60179 6.07285 3.94407 7.26646L1 6.81886L1 6.81886C1.23474 8.77576 2.83638 10.2838 4.80313 10.3997L2.34228 11.2949C3.23714 13.0853 4.86577 13.3628 7.04027 13.5329L7.04027 13.5329C5.26293 14.7456 3.15085 15.3717 1 15.3233C12.4183 20.3992 19.1208 12.9421 19.1208 6.37125V5.62823L21 4.26751Z"
                  stroke="#455D65"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </Link>

          {/* <Link href="/">
              <a>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
                </svg>
              </a>
            </Link>

            <Link href="/">
              <a>
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </Link> */}

          <Link href="https://getalby.com/p/nostrdirectory">
            <a target="_blank">
              <Image
                src="/assets/images/alby.svg"
                alt="donate to support nostr.directory"
                height="20"
                width="20"
              />
            </a>
          </Link>
          <Link href="mailto:hello@nostr.directory">
            <a target="_blank">
              <p className="py-2 px-6 rounded-full text-base font-medium text-nostr-solid-darker bg-[#5f338414]">
                Contact us
              </p>
            </a>
          </Link>
        </>
      </div>
    </div>
    <style jsx>
      {`
        .icon-list {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 32px;
        }
        .icon-list a {
          display: flex;
          flex-direction: row;
          align-items: center;
        }
        footer {
          border-top: 1px solid #d3edeb;
        }
        .container {
          display: flex;
          width: 100%;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
        }
        @media (min-width: 0) {
          .container {
            flex-direction: column;
          }
        }
        @media (min-width: 700px) {
          .container {
            flex-direction: row;
          }
        }
      `}
    </style>
  </footer>
);

export { Footer };
