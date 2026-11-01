import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';

test('anonymous V2 navigation is read-only and does not initialize deprecated Twitter authentication', async () => {
  const { Navbar } = await import('../../src/templates/Navbar');
  const html = renderToStaticMarkup(React.createElement(Navbar));
  expect(html).toContain('Historical statistics');
  expect(html).toContain('Find people');
  expect(html).not.toContain('Sign in with Twitter');
});
