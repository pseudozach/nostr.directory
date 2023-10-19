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

### or you can fork and start developing with gitpod.  
[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/pseudozach/nostr.directory)

# db backups
* database is exported every 24hours and made available at https://storage.googleapis.com/storage/v1/b/nostrdb-backups/o?prefix=ndjson in .ndjson format.

# credits
* nostr: https://github.com/nostr-protocol/nostr
* cloned from https://github.com/ixartz/Next-JS-Landing-Page-Starter-Template