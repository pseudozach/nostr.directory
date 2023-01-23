import Document, { Html, Head, Main, NextScript } from 'next/document';

import { AppConfig } from '../utils/AppConfig';

// Need to create a custom _document because i18n support is not compatible with `next export`.
class MyDocument extends Document {
  render() {
    return (
      <Html lang={AppConfig.locale}>
        <Head />
        <body className="bg-[url('/assets/images/bg.svg')] bg-no-repeat bg-[width:200px_100%] bg-top bg-">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
