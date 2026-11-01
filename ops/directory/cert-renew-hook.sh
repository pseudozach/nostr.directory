#!/bin/sh
set -eu
if [ "${RENEWED_LINEAGE:-}" = /etc/letsencrypt/live/api.nostr.directory ]; then
    /usr/sbin/nginx -t
    /bin/systemctl reload nginx
fi
