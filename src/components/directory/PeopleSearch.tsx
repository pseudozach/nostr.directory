/* eslint-disable no-void -- Search handles its own errors and cancellation. */
import React, { useEffect, useRef, useState } from 'react';

import { Avatar } from './Avatar';
import { IdentityBadges } from './IdentityBadges';
import { directoryQuery, normalizePerson, publicKey } from './model';
import type { Person } from './model';
import { directoryRequest } from './request';

export type PeopleResult = {
  items: Person[];
  coverage: unknown;
  asOf: string | null;
  stale: boolean;
  nextCursor: string | null;
};

export async function loadPeople(
  query: string,
  platform: string,
  state: string,
  cursor?: string,
  transport: typeof fetch = fetch,
  signal?: AbortSignal
): Promise<PeopleResult> {
  const params = directoryQuery(query, platform, state, cursor);
  const key = publicKey(query.trim());
  const data = await directoryRequest(async (boundedSignal) => {
    const response = await transport(
      key ? `/api/directory/${key}` : `/api/directory?${params}`,
      { signal: boundedSignal, credentials: 'omit', cache: 'no-store' }
    );
    if (!response.ok)
      throw new Error(
        'Directory unavailable. Please retry; no empty result is inferred.'
      );
    return response.json();
  }, signal);
  if (key)
    return {
      items: [normalizePerson(data)],
      coverage: 'Key lookup in our observed corpus',
      asOf: null,
      stale: !data.observedComplete,
      nextCursor: null,
    };
  if (!Array.isArray(data.items))
    throw new Error('Invalid directory response. Please retry.');
  return {
    items: data.items.map(normalizePerson),
    coverage: data.coverage ?? 'Coverage unavailable',
    asOf: typeof data.asOf === 'string' ? data.asOf : null,
    stale: data.stale !== false,
    nextCursor: typeof data.nextCursor === 'string' ? data.nextCursor : null,
  };
}

export function PersonCard({ person }: { person: Person }) {
  return (
    <article className="directory-card">
      <div className="directory-person-heading">
        <Avatar
          key={`${person.pubkey}:${person.metadata.picture ?? ''}`}
          picture={person.metadata.picture}
        />
        <h2>
          <a href={`/p/${person.npub}`}>
            {person.metadata.display_name ||
              person.metadata.name ||
              person.npub}
          </a>
        </h2>
      </div>
      <p className="directory-key">{person.npub}</p>
      {person.metadata.about && <p>{person.metadata.about}</p>}
      <IdentityBadges person={person} />
    </article>
  );
}

export function PeopleResults({
  result,
  loading,
  error,
}: {
  result?: PeopleResult;
  loading: boolean;
  error: string;
}) {
  if (error) return <p role="alert">{error}</p>;
  if (loading) return <p role="status">Loading people…</p>;
  if (!result) return null;
  return (
    <div>
      <div className="directory-coverage" role="status">
        <strong>
          {result.stale
            ? 'Stale or incomplete observations.'
            : 'Observed directory.'}
        </strong>{' '}
        This is not a global census of Nostr.{' '}
        {result.asOf
          ? `As of ${result.asOf}.`
          : 'Observation time unavailable.'}
        <details>
          <summary>Coverage and sources</summary>
          <pre>
            {typeof result.coverage === 'string'
              ? result.coverage
              : JSON.stringify(result.coverage, null, 2)}
          </pre>
        </details>
      </div>
      {result.items.length ? (
        <div className="directory-grid">
          {result.items.map((person) => (
            <PersonCard key={person.pubkey} person={person} />
          ))}
        </div>
      ) : (
        <p>No people match these filters in our observed corpus.</p>
      )}
    </div>
  );
}

export function PeopleSearch() {
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('');
  const [state, setState] = useState('');
  const [result, setResult] = useState<PeopleResult>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef<AbortController>();
  const search = async (cursor?: string) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    try {
      const next = await loadPeople(
        query,
        platform,
        state,
        cursor,
        fetch,
        controller.signal
      );
      if (!controller.signal.aborted)
        setResult((previous) =>
          cursor && previous
            ? {
                ...next,
                items: [
                  ...previous.items,
                  ...next.items.filter(
                    (person) =>
                      !previous.items.some(
                        (old) => old.pubkey === person.pubkey
                      )
                  ),
                ],
              }
            : next
        );
    } catch (cause) {
      if (!controller.signal.aborted) {
        setResult(undefined);
        setError(
          cause instanceof Error ? cause.message : 'Directory unavailable'
        );
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };
  useEffect(() => {
    void search();
    return () => request.current?.abort();
    // Initial browse runs once; filters are submitted explicitly, never per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <section
      className="directory-shell"
      id="people-directory"
      aria-label="People directory"
    >
      <h2>People directory</h2>
      <p>
        Browse without signing in. Search names, public keys (npub / nprofile),
        or external identities. A signed claim is not independent proof.
      </p>
      <form
        className="directory-search"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <label>
          Search people
          <input
            type="search"
            value={query}
            maxLength={1024}
            placeholder="Name, npub, nprofile, or handle"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          Platform
          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
          >
            <option value="">All platforms</option>
            {[
              'github',
              'bluesky',
              'mastodon',
              'twitter',
              'telegram',
              'discord',
            ].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Evidence state
          <select
            value={state}
            onChange={(event) => setState(event.target.value)}
          >
            <option value="">All states</option>
            <option value="verified">NIP39 verified</option>
            <option value="claim">Signed / unchecked</option>
            <option value="not-checkable">Not checkable</option>
            <option value="stale">Stale</option>
            <option value="legacy">Legacy evidence</option>
          </select>
        </label>
        <button type="submit" disabled={loading}>
          Search
        </button>
      </form>
      <PeopleResults result={result} loading={loading} error={error} />
      {error && (
        <button
          type="button"
          onClick={() => {
            void search();
          }}
        >
          Retry directory
        </button>
      )}
      {!loading && !error && result?.nextCursor && (
        <button
          type="button"
          onClick={() => {
            void search(result.nextCursor!);
          }}
        >
          Load more people
        </button>
      )}
    </section>
  );
}
