PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
CREATE TABLE IF NOT EXISTS proof_cache (key TEXT PRIMARY KEY, result TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS outbound_budget (singleton INTEGER PRIMARY KEY CHECK(singleton = 1), day INTEGER NOT NULL, used INTEGER NOT NULL);
-- Bounded current editing cache, never event history or a verification authority.
CREATE TABLE IF NOT EXISTS current_payloads (
  pubkey TEXT NOT NULL, kind INTEGER NOT NULL, payload TEXT NOT NULL,
  PRIMARY KEY(pubkey, kind)
);
CREATE TABLE IF NOT EXISTS service_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
-- Directory-derived public claims only; NOT a relay archive.
CREATE TABLE IF NOT EXISTS current_events (
  pubkey TEXT NOT NULL,
  kind INTEGER NOT NULL,
  id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (pubkey, kind)
);
CREATE TABLE IF NOT EXISTS identities (
  pubkey TEXT NOT NULL,
  event_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  platform TEXT NOT NULL,
  identity TEXT NOT NULL,
  raw_tag_json TEXT NOT NULL,
  PRIMARY KEY (pubkey, position)
);
CREATE INDEX IF NOT EXISTS identities_lookup ON identities(platform, identity);
CREATE INDEX IF NOT EXISTS identities_lookup_folded ON identities(platform, identity COLLATE NOCASE);
CREATE TABLE IF NOT EXISTS suppression (
  pubkey TEXT PRIMARY KEY,
  reason TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS checkpoints (
  source TEXT NOT NULL,
  filter_hash TEXT NOT NULL,
  watermark INTEGER NOT NULL,
  PRIMARY KEY (source, filter_hash)
);
