import React from 'react';

import { text } from './model';
import type { Claim, Person } from './model';

function evidenceDate(value: unknown): string | undefined {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      value
    ) ||
    !Number.isFinite(Date.parse(value))
  )
    return undefined;
  return value;
}

function claimLabel(claim: Claim): string {
  if (claim.state === 'verified' && evidenceDate(claim.checkedAt))
    return 'NIP39 verified';
  if (['claim', 'unchecked', 'verified'].includes(claim.state))
    return 'Signed claim / unchecked';
  return claim.state;
}

export function IdentityBadges({ person }: { person: Person }) {
  return (
    <div className="directory-evidence">
      <h3>Current NIP39 claims</h3>
      {!person.claims.length && (
        <p>
          No current claims observed. This is not a claim of global absence.
        </p>
      )}
      <ul>
        {person.claims.map((claim, index) => (
          <li key={`${claim.platform}:${claim.identity}:${index}`}>
            <strong>
              {claim.platform}: {claim.identity}
            </strong>
            {' — '}
            <span>{claimLabel(claim)}</span>
            {evidenceDate(claim.checkedAt) && (
              <small> · checked {evidenceDate(claim.checkedAt)}</small>
            )}
            {claim.reason && <p>{claim.reason}</p>}
            {claim.proof !== undefined && (
              <details>
                <summary>Proof reference (not an endorsement)</summary>
                <pre>{JSON.stringify(claim.proof, null, 2)}</pre>
              </details>
            )}
          </li>
        ))}
      </ul>
      {person.legacy.length > 0 && (
        <section aria-label="Legacy evidence">
          <h3>Legacy evidence</h3>
          <p>
            Historical records, not fresh NIP39 verification. Unknown dates stay
            unknown.
          </p>
          <ul>
            {person.legacy.map((entry, index) => (
              <li key={index}>
                {text(entry.platform, 100) ?? 'Historical account'}:{' '}
                {text(entry.identity) ?? text(entry.screenName) ?? 'Record'} —{' '}
                {entry.historicallyVerified === true || entry.verified === true
                  ? 'historically verified'
                  : 'legacy claim'}{' '}
                ·{' '}
                {evidenceDate(entry.verifiedAt) ??
                  evidenceDate(entry.verified_at) ??
                  'verification date unknown'}
                {text(entry.method, 128) && (
                  <small> · method: {text(entry.method, 128)}</small>
                )}
                {text(entry.proofUrl, 2048) && (
                  <details>
                    <summary>
                      Historical proof reference (not rechecked)
                    </summary>
                    <pre>{text(entry.proofUrl, 2048)}</pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
