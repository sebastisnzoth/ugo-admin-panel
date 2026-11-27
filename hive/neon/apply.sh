#!/usr/bin/env bash
# UGO Hive · aplicación del paquete de migraciones (idempotente, atómica y con puerta de destino).
#
#   HIVE_TEST_DATABASE_URL='postgresql://…' hive/neon/apply.sh preflight
#   HIVE_TEST_DATABASE_URL='postgresql://…' hive/neon/apply.sh verify
#   HIVE_TEST_DATABASE_URL='postgresql://…' hive/neon/apply.sh apply
#
# Primera aplicación a una base no registrada exige confirmación explícita, porque la
# identidad del destino NO puede deducirse de una variable:
#   HIVE_CONFIRM_FIRST_APPLY=APLICAR hive/neon/apply.sh apply
# Opcional, si ya se conoce la huella del servidor:  HIVE_EXPECTED_FINGERPRINT=<sha256>
#
# Reglas:
#   · la URL nunca se imprime ni se escribe en disco;
#   · todas las migraciones corren en UNA transacción (si algo falla, no queda a medias);
#   · el destino se valida dentro de SQL (00) y además aquí, por host;
#   · no existe ninguna ruta que borre datos ni esquemas.

set -euo pipefail

ACTION="${1:-}"
PROJECT_ID="${HIVE_PROJECT_ID:-dry-heart-24391962}"
DATABASE_NAME="${HIVE_DATABASE_NAME:-hive}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -z "${HIVE_TEST_DATABASE_URL:-}" ]; then
  echo "ERROR: falta HIVE_TEST_DATABASE_URL (secreto de entorno; nunca en el repositorio)." >&2
  exit 1
fi
# El destino debe ser la base Neon de Hive. Se rechaza Arena/Supabase antes de conectar.
case "$HIVE_TEST_DATABASE_URL" in
  *supabase.co*|*supabase.com*|*trfsjuseqjxlhrxuvdsm*|*tmossnqfwfwjrtzwcbmm*)
    echo "ERROR: el destino apunta a UGO Arena/Supabase. Hive no migra Arena." >&2; exit 1;;
  *neon.tech*|*localhost*|*127.0.0.1*|*%2Ftmp*|*host=/tmp*) ;;
  *) echo "ERROR: destino no reconocido como Neon/Postgres local autorizado." >&2; exit 1;;
esac
command -v psql >/dev/null || { echo "ERROR: falta psql (postgresql-client)." >&2; exit 1; }

# PGOPTIONS transporta los parámetros de la puerta de destino; nunca viajan por argv.
SETTINGS="-c hive.target_project=${PROJECT_ID} -c hive.target_database=${DATABASE_NAME}"
if [ "${HIVE_CONFIRM_FIRST_APPLY:-}" = "APLICAR" ]; then
  SETTINGS="$SETTINGS -c hive.confirm_first_apply=APLICAR"
fi
if [ -n "${HIVE_EXPECTED_FINGERPRINT:-}" ]; then
  SETTINGS="$SETTINGS -c hive.expected_fingerprint=${HIVE_EXPECTED_FINGERPRINT}"
fi
export PGOPTIONS="$SETTINGS"
PSQL=(psql "$HIVE_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -X -q)

case "$ACTION" in
  preflight)
    "${PSQL[@]}" -f "$DIR/preflight.sql"
    ;;
  verify)
    "${PSQL[@]}" -f "$DIR/migrations/08_verify.sql"
    ;;
  apply)
    echo "== preflight (solo lectura) =="
    "${PSQL[@]}" -f "$DIR/preflight.sql" | tail -n 40
    echo "== aplicando migraciones en una única transacción =="
    # --single-transaction: cualquier error revierte TODO. Nada queda a medias.
    "${PSQL[@]}" --single-transaction \
      -f "$DIR/migrations/00_destination_and_meta.sql" \
      -f "$DIR/migrations/01_roles.sql" \
      -f "$DIR/migrations/02_catalog.sql" \
      -f "$DIR/migrations/03_queue.sql" \
      -f "$DIR/migrations/04_job_effects.sql" \
      -f "$DIR/migrations/05_provider_budget.sql" \
      -f "$DIR/migrations/06_functions.sql" \
      -f "$DIR/migrations/07_grants.sql" \
      -f "$DIR/migrations/08_verify.sql"
    echo "== estado final =="
    "${PSQL[@]}" -At -F' | ' \
      -c "select 'schema_version', value from hive.meta where key='schema_version'" \
      -c "select 'destination_fingerprint', left(value, 16) || '…' from hive.meta where key='destination_fingerprint'" \
      -c "select 'departments', count(*) from hive.departments" \
      -c "select 'agents_total', count(*) from hive.agents" \
      -c "select 'agents_legacy_preserved', count(*) from hive.agents where legacy_status is not null" \
      -c "select 'agents_operative', count(*) from hive.agents where state='OPERATIVE'" \
      -c "select 'jobs', count(*) from hive.jobs" \
      -c "select 'jobs_finished', count(*) from hive.jobs where state in ('SUCCEEDED','FAILED','CANCELLED')" \
      -c "select 'jobs_queued', count(*) from hive.jobs where state='QUEUED'" \
      -c "select 'queue', hive.queue_metrics()::text"
    ;;
  *)
    echo "Uso: $0 {preflight|apply|verify}" >&2
    exit 2;;
esac
