# Relay-backed directory operations

## Boundaries

- Frontend: existing Next.js/Vercel project, production branch `master`.
- Read/publication API: `https://api.nostr.directory`, proxied to the loopback-only standalone service.
- Upstream Ditto 2.5.1 owns canonical signed events. SQLite is a derived index and proof cache, not the canonical event archive.
- No service possesses an owner signing key. Publication requires a user-signed original, matching positive relay acknowledgment, and signed canonical-current readback.
- Coverage is always explicitly partial: bounded peer windows, overlapping samples and rotating admitted-author reconciliation are not exhaustive Nostr coverage.
- External verification is distinct from a signature. Unsupported, inaccessible, expired or budget-blocked proofs must not acquire a current verified badge.
- Legacy records remain historical evidence. No new Firestore collection or paid indexing service is introduced.

## Running deployment

`ops/directory/compose.yaml` defines only the `nostr-directory-v2` relay project. Its internal network is not a public relay listener. Preserve its persistent data volume. Do not use global Docker prune, daemon restarts, or unrelated Compose projects as recovery steps.

`nostr-directory-api.service` uses a dynamic unprivileged user, a dedicated SQLite state directory, resource limits, read-only system protection and bounded discovery. The installed Node runtime and release artifacts reside under `/opt/nostr-directory`.

The current service configuration admits at most 10,000 authors, bootstraps finite batches, and runs periodic discovery/proof work. External proof requests share an atomic SQLite budget of 500 per UTC day across service restarts. Construction does not initiate proof requests. Two concurrent checks and finite batches bound scheduled proof work.

Certificate renewal is scoped to the API hostname by `nostr-directory-cert-renew.timer`; its deployment hook tests Nginx configuration before a graceful reload. Do not replace unrelated certificate renewal policies or shared Nginx blocks.

## Health and diagnosis

```sh
systemctl is-active nostr-directory-api nostr-directory-cert-renew.timer
curl --fail --silent --show-error https://api.nostr.directory/health
curl --fail --silent --show-error 'https://api.nostr.directory/api/directory'
journalctl -u nostr-directory-api --since '-15 minutes' --no-pager
```

HTTP 200 and `ok:true` establish process/API availability, not complete discovery or external verification. Inspect coverage source errors, saturation and completion dates separately. An unavailable upstream must not be relabeled as a successfully observed empty owner list.

## Release protocol

1. Freeze implementation changes and reconcile the independent review.
2. Run canonical regressions, the integrated isolated fixture suite, strict types, non-mutating lint, and the production build against those final bytes. Native transport qualification must use the isolated HTTPS fixture, not only injected request mocks.
3. Qualify upstream replacement/empty-list ordering, acknowledgment/readback, restart, and independent cold-copy restore. Dummy fixture identities must never be sent to the public deployment.
4. Bundle `services/directory/src/main.ts` into the staged `src/main.cjs`, preserving `schema.sql` beside the runtime source directory. Exclude optional native WebSocket acceleration modules rather than loading host-native binaries into the bundle.
5. Run `ops/directory/activate-api.py`. It installs a content-addressed immutable release, switches only `/opt/nostr-directory/current`, restarts only this API, checks loopback readiness and rolls back that pointer if readiness fails. Read its receipt and independently verify public HTTPS afterward.
6. Commit only reviewed application/ops/tests/docs. Never stage `.env`, provider credentials, raw environments, private identity files, SQLite/WAL files, fixture snapshots or `.hermes` evidence.
7. Fast-forward the authorized production branch; wait for the existing Vercel integration to finish. Check the exact deployed commit/status, public home, search, profiles, API errors and mobile layout before declaring frontend deployment complete.
8. Owner QA precedes announcements or grant submissions. No announcement is implied by code/deployment approval.

## Rollback and recovery

Frontend rollback is a Vercel deployment rollback or a reviewed forward revert of the release commit; preserve the previous deployment handle. Do not reset or force-push shared history.

For an API rollback, verify the previous immutable release exists, replace only the `current` symlink atomically, restart only `nostr-directory-api`, and check loopback plus public HTTPS. Never select an arbitrary old data snapshot as part of a code rollback.

Back up canonical relay data only from a quiesced relay or an upstream-supported consistent snapshot. Preserve sparse files: Ditto's deletion Bloom filter has a large logical size but little allocated storage. A plain expanding copy can exhaust a small restore scratch volume. Keep the original snapshot unchanged and test an independent copy before considering it recoverable.

A derived SQLite rebuild must retain original signed current events, owner-empty replacements and suppression semantics. Proof-cache/quota/suppression state is operational state: preserve SQLite consistently, including WAL handling, rather than assuming all such state can be reconstructed from public events. Never restore a stale quota database to bypass the daily limit.

The release evidence directory on the operator host records command exits, upstream contract results, cold-copy restore results and activation receipts. Evidence is not a substitute for verifying the running release. Never publish secrets or private host logs as a release artifact.
