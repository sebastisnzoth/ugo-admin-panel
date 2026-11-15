#!/usr/bin/env bash
# UGO: schema-only export from Supabase TEST for Neon migration review.
# Requirements: pg_dump client, UGO_SUPABASE_TEST_DATABASE_URL in environment.
set -euo pipefail
: "${UGO_SUPABASE_TEST_DATABASE_URL:?Missing TEST database connection}"
if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required" >&2
  exit 2
fi
# Do not permit the source to be misselected as the production project.
case "$UGO_SUPABASE_TEST_DATABASE_URL" in
  *tmossnqfwfwjrtzwcbmm*) ;;
  *) echo "Connection is not tagged as UGO Arena TEST; refusing." >&2; exit 2 ;;
esac
out_dir="${1:-./.local-neon-export}"
mkdir -p "$out_dir"
chmod 700 "$out_dir"
umask 077
PGCONNECT_TIMEOUT=12 pg_dump \
  --dbname="$UGO_SUPABASE_TEST_DATABASE_URL" \
  --schema=public \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file="$out_dir/ugo-public-schema.sql"
echo "Schema-only export created locally. Review Supabase Auth, Storage, Realtime and RLS before adapting for Neon."
echo "No row data was exported or applied."
