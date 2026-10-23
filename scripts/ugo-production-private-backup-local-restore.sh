#!/usr/bin/env bash
# SAFE LOCAL RESTORE ONLY: no remote writes. Use a PostgreSQL 17 clone, locally administered.
set -Eeuo pipefail
umask 077

die(){ echo "BLOCKED: $*" >&2; exit 2; }
command -v pg_dump >/dev/null || die "pg_dump missing"
command -v pg_restore >/dev/null || die "pg_restore missing"
command -v psql >/dev/null || die "psql missing"
[[ -n "${UGO_PROD_SOURCE_URL:-}" ]] || die "UGO_PROD_SOURCE_URL required via private environment"
[[ -n "${UGO_ISOLATED_RESTORE_URL:-}" ]] || die "UGO_ISOLATED_RESTORE_URL required via private environment"
[[ "${UGO_RESTORE_APPROVED:-}" == "ISOLATED_LOCAL_ONLY" ]] || die "Explicit isolated-local acknowledgement required"
# Require a loopback destination; disallow production/TEST Supabase addresses.
case "$UGO_ISOLATED_RESTORE_URL" in
  *'@localhost:'*|*'@127.0.0.1:'*|*'@localhost/'*|*'@127.0.0.1/'*) ;;
  *) die "Restore destination MUST be loopback PostgreSQL, not cloud" ;;
esac
[[ "$UGO_PROD_SOURCE_URL" == *'trfsjuseqjxlhrxuvdsm'* ]] || die "Source URL is not the UGO PROD project"
[[ "$UGO_ISOLATED_RESTORE_URL" != *supabase.co* ]] || die "Cloud restore explicitly forbidden"
out="${1:-}"
[[ -n "$out" ]] || die "Specify a NEW private dump filename"
[[ ! -e "$out" ]] || die "Refusing to overwrite an existing dump"
mkdir -p "$(dirname "$out")"
echo "Creating private PostgreSQL custom-format dump. Never upload to GitHub." >&2
pg_dump --format=custom --no-owner --no-acl --file="$out" "$UGO_PROD_SOURCE_URL"
chmod 600 "$out"
pg_restore --list "$out" >/dev/null || die "Archive integrity check failed"
echo "Archive structure validated. Restoring into acknowledged LOCAL PostgreSQL." >&2
# Never --clean/--create: destination must be new and empty.
objects=$(psql "$UGO_ISOLATED_RESTORE_URL" -X -Atqc "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v','m')" ) || die "Cannot inspect LOCAL destination"
[[ "$objects" == "0" ]] || die "LOCAL destination public schema is not empty"
pg_restore --exit-on-error --no-owner --no-acl --dbname="$UGO_ISOLATED_RESTORE_URL" "$out"
psql "$UGO_ISOLATED_RESTORE_URL" -X -v ON_ERROR_STOP=1 -c "select count(*) as public_tables from information_schema.tables where table_schema='public';"
echo "Restore completed to local sandbox. Verify auth/storage schemas and app runtime separately." >&2
