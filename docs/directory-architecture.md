# Relay-backed directory architecture

This implementation preserves the existing MIT application, public routes and legacy data. It introduces no new Firestore collection, index, write or billing dependency. Operational procedures are in [directory-operations.md](directory-operations.md).

## Storage and trust

Pinned upstream Ditto Relay 2.5.1, source `4f330c0850a9c9d3084ebc2c3baeabec7dd24639`, owns canonical signed kind 0 / 10011 events. Upstream remains separately licensed AGPL-3.0-or-later; the application license does not replace it. The release binary's checksum and source pin were checked; source-to-binary reproducibility has not been established.

The standalone Node 22 TypeScript service derives current identity membership in SQLite, alongside suppression, discovery progress, proof cache and atomic outbound quota. It does not maintain a second full event-body archive. Current ordering is greatest timestamp, then smallest event ID. A signed empty kind 10011 authoritatively clears membership.

`src/identity/events.ts` validates bounded public-event wire fields, event hash and signature without trusting mutable SDK verification caches. Unknown top-level payload fields are rejected rather than forwarded with valid signatures. Raw signed tags/content are preserved; the service never signs or rewrites an owner's original.

`services/directory/src/ingest.ts` requires positive matching relay acknowledgment and validated canonical-current signed readback before projecting. Admission, capped historical windows and rotating admitted-author reconciliation remain bounded. A saturated/clipped window is not complete coverage; upstream failure is not observed-empty state. Coverage is explicitly partial, including source availability and progress.

## External proofs

A signature proves a claim's author, not external ownership. Proof checks bind to exact current event ID, tag position, platform, identity, proof and verifier version. Removal/replacement invalidates membership. The durable cache and SQLite reservation gate share at most 500 outbound requests per UTC day; clock rewind cannot mint quota. The periodic worker uses finite rotating batches and two concurrent checks, with abort/drain on shutdown.

Destinations are constructed from supported provider declarations. All DNS answers are screened, and the production socket is pinned to a screened address while preserving HTTPS Host, SNI and certificate-hostname validation. Redirects, compressed-response bypasses, oversized bodies and expired deadlines are rejected. Unsupported/inaccessible evidence remains unverified rather than a fabricated mismatch or success. Fixture qualification is not a guarantee that every provider remains accessible or interoperable live.

## Frontend and API

The existing Next.js frontend uses bounded same-origin API adapters, not anonymous browser fanout to public peers. Their upstream origin defaults to `https://api.nostr.directory`; a server-only override supports explicit HTTPS origins or loopback HTTP fixtures. User-controlled destinations, forwarded browser credentials and redirects are not accepted. Responses and deadlines are bounded. Outages surface as unavailable/error rather than invented empty results.

Public browsing does not initialize deprecated OAuth. Remote avatars require explicit opt-in and disclose the external IP-address exposure. Current verification and historical legacy evidence are displayed separately, with unknown legacy dates retained as unknown.

The owner editor observes the current signed whole list, preserves unrelated tags, reviews changes and rebases against fresh state before signing. Browser-signer consent, signing and publication are separate actions. Revocation/edits/unmount must invalidate pending work. Publication is confirmed only by the agreed compact backend acknowledgment and signed readback; an indeterminate failure must not be displayed as success. No owner key is accepted by the server.

## Qualification and release limits

Node 22 built-in SQLite emits an experimental warning on this runtime. Deterministic and networkless unprivileged fixtures use disposable databases and test-only signers. They do not access owner identity or publish fixture accounts publicly.

Upstream contract tests and independent cold-copy dummy-data restores supplement component tests. Final-byte integrated tests, strict types, lint, build, independent review, fresh browser checks and deployed-commit verification remain separate release gates. A passing component suite does not establish the backend→proxy contract, complete discovery, live provider verification or production deployment. Owner QA precedes announcements and grant work.
