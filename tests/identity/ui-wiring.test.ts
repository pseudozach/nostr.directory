import { readFileSync } from 'node:fs';

import { expect, test } from 'vitest';

test('homepage and profile wiring retire fake counters and legacy signing while retaining brand shell', () => {
  const list = readFileSync('src/templates/List.tsx', 'utf8');
  const hero = readFileSync('src/templates/Hero.tsx', 'utf8');
  const profile = readFileSync('src/templates/Profile.tsx', 'utf8');
  expect(list).toContain('PeopleSearch');
  expect(list).not.toContain('firebase');
  expect(list).not.toContain('tweetCount');
  expect(hero).not.toContain('intent/tweet');
  expect(hero).toContain('Link accounts');
  expect(profile).toContain('DirectoryProfile');
  const base = readFileSync('src/templates/Base.tsx', 'utf8');
  expect(base).toContain('<main');
});
