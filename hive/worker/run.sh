#!/usr/bin/env bash
# UGO Hive · arranque del worker. No contiene secretos: todo entra por entorno.
#   export HIVE_WORKER_DATABASE_URL='postgresql://hive_worker:…@…/hive?sslmode=require'
#   hive/worker/run.sh --self-check && hive/worker/run.sh
set -euo pipefail

cd "$(dirname "$0")/../.."

fail() { printf 'ugo-hive-worker: %s\n' "$1" >&2; exit 1; }

[ -n "${HIVE_WORKER_DATABASE_URL:-}" ] || fail "falta HIVE_WORKER_DATABASE_URL (rol hive_worker, nunca el de migraciones)"
command -v psql >/dev/null 2>&1 || fail "psql no está instalado"
command -v node >/dev/null 2>&1 || fail "node no está instalado"

case "${HIVE_WORKER_DATABASE_URL}" in
  *:postgres:*|*superuser*) fail "la URL parece de un rol privilegiado; usar hive_worker" ;;
esac

# Una sola tarea y un solo agente por defecto: techo explícito.
export HIVE_WORKER_MAX_JOBS="${HIVE_WORKER_MAX_JOBS:-1}"
export HIVE_WORKER_MAX_ITERATIONS="${HIVE_WORKER_MAX_ITERATIONS:-1}"
export HIVE_WORKER_CONCURRENCY="${HIVE_WORKER_CONCURRENCY:-1}"

exec node hive/worker/worker.mjs "$@"
