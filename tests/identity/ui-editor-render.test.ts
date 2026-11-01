import React from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';

import { IdentityEditor } from '../../src/components/directory/IdentityEditor';

test('editor renders unchecked public-link consent and explicit connect with no key custody form', () => {
  const html = renderToStaticMarkup(
    React.createElement(IdentityEditor, { expectedPubkey: undefined })
  );
  expect(html).toContain('Connect browser signer');
  expect(html).toContain('type="checkbox"');
  expect(html).not.toContain('checked=""');
  expect(html).toContain('public and may be permanent');
  expect(html).not.toContain('type="password"');
  expect(html).not.toContain('name="nsec"');
  expect(html).toContain('Import already-signed public list');
});
