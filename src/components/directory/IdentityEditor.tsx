/* eslint-disable no-void -- Explicitly mark handled, intentionally unawaited UI promises. */
import React, { useEffect, useRef, useState } from 'react';

import { nip19 } from 'nostr-tools';

import {
  importSignedList,
  observeList,
  publishReviewed,
  reviewEdit,
  signReviewed,
  withDeadline,
} from './workflow';
import type { IdentityEdit, Observation } from './workflow';
import type { IdentityDraft } from '../../identity/editor';
import type { DirectoryEvent } from '../../identity/events';
import type { IdentitySigner } from '../../identity/signer';

export function IdentityEditor({
  expectedPubkey,
}: {
  expectedPubkey?: string;
}) {
  const [consent, setConsent] = useState(false);
  const [publishConsent, setPublishConsent] = useState(false);
  const [base, setBase] = useState<Observation>();
  const [draft, setDraft] = useState<IdentityDraft>();
  const [signed, setSigned] = useState<DirectoryEvent>();
  const [identity, setIdentity] = useState('');
  const [proof, setProof] = useState('');
  const [importText, setImportText] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const signer = useRef<IdentitySigner>();
  const generation = useRef(0);
  useEffect(() => {
    generation.current += 1;
    signer.current = undefined;
    setBase(undefined);
    setDraft(undefined);
    setSigned(undefined);
    setPublishConsent(false);
    setBusy(false);
    setError('');
    setStatus('');
    return () => {
      // Also invalidates in-flight work on profile changes and unmount.
      generation.current += 1;
    };
  }, [expectedPubkey]);
  const resetReview = () => {
    generation.current += 1;
    setBusy(false);
    setDraft(undefined);
    setSigned(undefined);
    setPublishConsent(false);
    setStatus('');
  };
  const act = async (
    operation: (isCurrent: () => boolean) => Promise<void>
  ) => {
    generation.current += 1;
    const operationGeneration = generation.current;
    const isCurrent = () => generation.current === operationGeneration;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await operation(isCurrent);
    } catch (cause) {
      if (!isCurrent()) return;
      setError(
        cause instanceof Error
          ? cause.message
          : 'Operation failed; no success confirmed.'
      );
    } finally {
      if (isCurrent()) {
        generation.current += 1;
        setBusy(false);
      }
    }
  };
  const connect = () => {
    resetReview();
    setBase(undefined);
    signer.current = undefined;
    return act(async (isCurrent) => {
      if (!consent) throw new Error('Explicit public-link consent required.');
      const extension = (window as Window & { nostr?: IdentitySigner }).nostr;
      if (!extension)
        throw new Error(
          'No NIP07 browser signer found. Install a compatible signer to edit; browsing needs no signer. Never provide a private key here.'
        );
      const pubkey = await withDeadline(extension.getPublicKey());
      if (!isCurrent()) return;
      if (
        !/^[a-f0-9]{64}$/.test(pubkey) ||
        (expectedPubkey && pubkey !== expectedPubkey)
      )
        throw new Error('Signer does not own this profile.');
      const latest = await withDeadline(observeList(pubkey));
      if (!isCurrent()) return;
      signer.current = extension;
      setBase(latest);
    });
  };
  const review = (edit: IdentityEdit) => {
    try {
      resetReview();
      setError('');
      if (!base || !consent)
        throw new Error('Connect and load the full list first.');
      setDraft(
        reviewEdit(
          base,
          edit,
          Math.max(
            Math.floor(Date.now() / 1000),
            (base.currentEvent?.created_at ?? 0) + 1
          )
        )
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Review failed');
    }
  };
  return (
    <section className="directory-editor" aria-label="Link accounts">
      <h2>Link accounts</h2>
      <p>
        NIP39 is a public, owner-signed full account list. Linking is public and
        may be permanent, including on other relays. It does not itself prove
        control of an external account.
      </p>
      <label className="directory-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => {
            setConsent(event.target.checked);
            resetReview();
          }}
        />
        I understand these account links are public and consent to reviewing a
        replacement list.
      </label>
      <button
        type="button"
        disabled={busy || !consent}
        onClick={() => {
          void connect();
        }}
      >
        Connect browser signer / load latest list
      </button>
      <p>
        Only your browser signer holds your keys. Never paste a private key.
        Current-list observations cover our configured sources, not every relay;
        simultaneous edits elsewhere remain possible.
      </p>
      {base && (
        <div>
          <p className="directory-key">{nip19.npubEncode(base.pubkey)}</p>
          <label>
            Standard proof text
            <textarea
              readOnly
              value={`Verifying my account on Nostr: ${nip19.npubEncode(
                base.pubkey
              )}`}
            />
          </label>
          <p>
            Copy this text and publish it from your external account yourself.
            Then enter the platform:identity and public proof reference below.
            Supported checkers may verify it later; unsupported platforms stay
            unchecked.
          </p>
          {!base.observedComplete && (
            <p role="alert">
              Observation incomplete. Editing is blocked. Reload the latest list
              before continuing.
            </p>
          )}
          <details open>
            <summary>Complete observed signed list</summary>
            <pre>
              {base.currentEvent
                ? JSON.stringify(base.currentEvent, null, 2)
                : 'No current list observed in a completed source observation. Creating a new list still needs explicit review.'}
            </pre>
          </details>
          <ul>
            {base.currentEvent?.tags.map(
              (tag, index) =>
                tag[0] === 'i' && (
                  <li key={index}>
                    {tag[1]}{' '}
                    <button
                      type="button"
                      disabled={busy || !base.observedComplete || !consent}
                      onClick={() => review({ remove: index })}
                    >
                      Review removal of {tag[1]}
                    </button>
                  </li>
                )
            )}
          </ul>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              review({ append: ['i', identity.trim(), proof] });
            }}
          >
            <label>
              Platform:identity
              <input
                value={identity}
                maxLength={2000}
                placeholder="github:username"
                onChange={(event) => {
                  setIdentity(event.target.value);
                  resetReview();
                }}
                required
              />
            </label>
            <label>
              Public proof reference
              <input
                value={proof}
                maxLength={4000}
                placeholder="Platform-specific proof identifier"
                onChange={(event) => {
                  setProof(event.target.value);
                  resetReview();
                }}
              />
            </label>
            <button
              type="submit"
              disabled={busy || !base.observedComplete || !consent}
            >
              Review addition
            </button>
          </form>
        </div>
      )}
      {draft && (
        <section aria-label="Replacement review">
          <h3>Review entire replacement</h3>
          <p>
            Unrelated entries, tags, order and content are preserved.{' '}
            {draft.tags.length === 0 &&
              'This replaces your list with an EMPTY list.'}{' '}
            Removing a claim removes active membership, not public history.
          </p>
          <pre>{JSON.stringify(draft, null, 2)}</pre>
          <button
            type="button"
            disabled={busy || !consent || !!signed}
            onClick={() => {
              void act(async (isCurrent) => {
                if (!base) throw new Error('Load latest list first');
                try {
                  const event = await signReviewed(
                    base,
                    draft,
                    signer.current,
                    consent,
                    undefined,
                    isCurrent
                  );
                  if (isCurrent()) setSigned(event);
                } catch (cause) {
                  if (!isCurrent()) return;
                  setDraft(undefined);
                  setSigned(undefined);
                  setPublishConsent(false);
                  throw cause;
                }
              });
            }}
          >
            Sign reviewed replacement
          </button>
        </section>
      )}
      <details>
        <summary>Import already-signed public list</summary>
        <p>
          Paste only an original public kind 10011 event, not a secret key. Its
          signature and author are verified locally; it is published unchanged
          after review.
        </p>
        <label>
          Signed public event JSON
          <textarea
            value={importText}
            maxLength={16384}
            onChange={(event) => {
              setImportText(event.target.value);
              resetReview();
            }}
          />
        </label>
        <button
          type="button"
          disabled={busy || !consent}
          onClick={() => {
            setError('');
            resetReview();
            try {
              setSigned(importSignedList(importText, expectedPubkey));
            } catch (cause) {
              setError(
                cause instanceof Error ? cause.message : 'Invalid event'
              );
            }
          }}
        >
          Review signed import
        </button>
      </details>
      {signed && (
        <section aria-label="Signed publication review">
          <h3>Signed list ready for review</h3>
          <pre>{JSON.stringify(signed, null, 2)}</pre>
          <label className="directory-consent">
            <input
              type="checkbox"
              checked={publishConsent}
              onChange={(event) => setPublishConsent(event.target.checked)}
            />
            I reviewed this entire signed list and consent to publishing it to
            the directory relay. Publication is not proof verification.
          </label>
          <button
            type="button"
            disabled={busy || !consent || !publishConsent}
            onClick={() => {
              void act(async (isCurrent) => {
                await publishReviewed(signed, consent && publishConsent);
                if (!isCurrent()) return;
                setStatus(
                  'Relay accepted and current signed list read back. External proof checks are separate, not automatically verified.'
                );
                setSigned(undefined);
                setDraft(undefined);
                setBase(undefined);
                setPublishConsent(false);
              });
            }}
          >
            Publish reviewed signed list
          </button>
        </section>
      )}
      {busy && <p role="status">Waiting for signer or directory…</p>}
      {error && (
        <p role="alert">
          {error} Reload/rebase and review again if current state changed. No
          publication success is inferred.
        </p>
      )}
      {status && <p role="status">{status}</p>}
    </section>
  );
}
