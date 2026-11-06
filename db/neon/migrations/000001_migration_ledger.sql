-- UGO Neon TEST — migration execution ledger (no production data)
-- Apply only to Neon branch br-tiny-field-b6v07tb3.
CREATE SCHEMA IF NOT EXISTS ugo_migration;
CREATE TABLE IF NOT EXISTS ugo_migration.schema_migrations (
  version text PRIMARY KEY,
  source text NOT NULL,
  checksum_sha256 text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by text NOT NULL DEFAULT current_user,
  CONSTRAINT source_not_blank CHECK (length(trim(source)) > 0),
  CONSTRAINT checksum_sha256_valid CHECK (checksum_sha256 ~ '^[a-f0-9]{64}$')
);
REVOKE ALL ON SCHEMA ugo_migration FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA ugo_migration FROM PUBLIC;
COMMENT ON TABLE ugo_migration.schema_migrations IS
'UGO versioned migration ledger; internal server administration only. Never expose to browser/Data API.';