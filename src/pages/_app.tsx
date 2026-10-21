import { useEffect } from 'react';

import { AppProps } from 'next/app';
import { useRouter } from 'next/router';

import { attachAnalytics } from '../utils/analytics';
import '../styles/global.css';

const MyApp = ({ Component, pageProps }: AppProps) => {
  const router = useRouter();

  useEffect(
    () => attachAnalytics(window, router, process.env.NODE_ENV),
    [router]
  );

  return <Component {...pageProps} />;
};

export default MyApp;
