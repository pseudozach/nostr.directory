import React from 'react';

import { useRouter } from 'next/router';

import { DirectoryProfile } from '../components/directory/DirectoryProfile';

const Profile = () => {
  const router = useRouter();
  const identifier = typeof router.query.id === 'string' ? router.query.id : '';
  return identifier ? (
    <DirectoryProfile identifier={identifier} />
  ) : (
    <p role="status">Loading profile…</p>
  );
};

export { Profile };
