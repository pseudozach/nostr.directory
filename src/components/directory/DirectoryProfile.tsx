/* eslint-disable no-void -- Effect work is cancelled on cleanup. */
import React, { useEffect, useState } from 'react';

import Link from 'next/link';

import { IdentityEditor } from './IdentityEditor';
import type { Person } from './model';
import { publicKey } from './model';
import { PersonCard } from './PeopleSearch';
import { resolveProfile } from './profile';

export function DirectoryProfile({ identifier }: { identifier: string }) {
  const [person, setPerson] = useState<Person>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setPerson(undefined);
    setError('');
    void resolveProfile(
      identifier,
      async (handle) => {
        // Compatibility only: no key lookup or directory search depends on Firestore.
        const { db } = await import('../../utils/firebase');
        const rows = await db
          .collection('twitter')
          .where('lcScreenName', '==', handle)
          .limit(1)
          .get();
        return rows.empty ? null : rows.docs[0]!.data();
      },
      fetch,
      controller.signal
    )
      .then((result) => {
        if (!controller.signal.aborted) setPerson(result.person);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : 'Profile unavailable'
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [identifier, retry]);
  return (
    <main className="directory-shell">
      <Link href="/">
        <a>← People directory</a>
      </Link>
      <h1>Public Nostr profile</h1>
      <p className="directory-key">{publicKey(identifier) ?? identifier}</p>
      {loading && <p role="status">Loading profile…</p>}
      {error && (
        <>
          <p role="alert">{error}</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            Retry profile
          </button>
        </>
      )}
      {person && (
        <>
          <PersonCard person={person} />
          <p>
            {person.observedComplete
              ? 'Current list observed from our configured sources.'
              : 'Observation incomplete; editing is blocked until the full current list is available.'}{' '}
            Other relays may have newer state.
          </p>
          <IdentityEditor expectedPubkey={person.pubkey} />
        </>
      )}
    </main>
  );
}
