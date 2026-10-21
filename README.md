# nostr.directory
* easy way to find people on nostr that you already follow on twitter/telegram/mastodon
* nostr anchored social profiles

## Bounties
* Please feel free to open issues and assign bounties to them as funders.
* Look at the list of issues/feature requests to claim bounties for fixing/delivering them.

We want to make this a useful and functional tool.

# build & run 
### locally
* `git clone https://github.com/pseudozach/nostr.directory && cd nostr.directory`  
* `cp .env.sample .env.local && npm run dev`  

### Analytics

Production uses the existing self-hosted Plausible service at
`https://plausible.physicalaiguide.com`, for the `nostr.directory` site.
The optional public `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` and
`NEXT_PUBLIC_PLAUSIBLE_ENDPOINT` overrides are documented in `.env.sample`;
no dashboard credentials belong in client-side configuration.

The shared application root records an initial pageview, completed client-side
navigation, outbound link clicks and supported file downloads. Query strings,
fragments and individual profile identifiers are not sent. Referrers and
outbound/download destinations are reduced to their origins; form contents
and arbitrary custom properties are not captured. Distinct profile visits
still count separately even though their reported route is `/p/[id]`.

Tracking is disabled for local/preview hosts, automated browsers, DNT, GPC,
and `localStorage.plausible_ignore === 'true'`. Privacy choices are rechecked
for each event. Router cleanup removes the navigation listener; the provider's
privacy-gated document listeners last for the document lifetime.
Firebase remains responsible for authentication and directory data, not
Google Analytics.

Run the isolated regression suite with `npm test`, then `npm run lint` and
`npm run build`. Tests do not send traffic to the production analytics service.

### or you can fork and start developing with gitpod.  
[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/pseudozach/nostr.directory)

# db backups
* database is exported every 24hours and made available at https://storage.googleapis.com/storage/v1/b/nostrdb-backups/o?prefix=ndjson in .ndjson format.

# credits
* nostr: https://github.com/nostr-protocol/nostr
* cloned from https://github.com/ixartz/Next-JS-Landing-Page-Starter-Template