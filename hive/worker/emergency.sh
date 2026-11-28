#!/usr/bin/env bash
# UGO Hive · interruptor de emergencia del worker.
#
# Dos niveles, ambos auditables:
#   1) archivo local (preferente): detiene a CUALQUIER worker que lo vea, sin tocar la base.
#      el worker NO puede escribir en hive.settings (sin INSERT/UPDATE por diseño), así que
#      el nivel 2 se activa con el rol de migraciones y queda registrado en job_events.
#   2) ajuste en base (hive.settings.emergency_stop): visible desde la consola Super Admin.
#
# Uso:
#   hive/worker/emergency.sh on        → crea el archivo y muestra cómo activar el nivel 2
#   hive/worker/emergency.sh off       → elimina SOLO el archivo (no toca la base)
#   hive/worker/emergency.sh status    → estado local + en base (si hay URL de lectura)
set -euo pipefail

cd "$(dirname "$0")/../.."
FILE="${HIVE_WORKER_EMERGENCY_FILE:-/tmp/ugo-hive-EMERGENCY-STOP}"
ACTION="${1:-status}"

case "$ACTION" in
  on)
    printf 'stop requested at %s by %s\n' "$(date -u +%FT%TZ)" "${USER:-unknown}" > "$FILE"
    echo "EMERGENCY_STOP activo (archivo): $FILE"
    echo "Los workers lo respetan en la siguiente comprobación (antes de cada trabajo)."
    echo
    echo "Nivel 2 (base de datos), con el rol de migraciones:"
    echo "  psql \"\$HIVE_MIGRATOR_DATABASE_URL\" -c \\"
    echo "    \"insert into hive.settings(key,value) values ('emergency_stop', to_jsonb(true)) \\"
    echo "     on conflict (key) do update set value = to_jsonb(true);\""
    ;;
  off)
    if [ -f "$FILE" ]; then rm -f "$FILE"; echo "EMERGENCY_STOP retirado (archivo): $FILE"; else echo "no había archivo de parada"; fi
    echo "Nivel 2 queda como esté: compruébalo con 'emergency.sh status'."
    ;;
  status)
    if [ -f "$FILE" ]; then echo "archivo: PRESENTE ($FILE)"; else echo "archivo: ausente ($FILE)"; fi
    if [ -n "${HIVE_WORKER_DATABASE_URL:-}" ]; then
      psql "$HIVE_WORKER_DATABASE_URL" -X -q -A -t -c \
        "select 'base: ' || coalesce((select (value #>> '{}') from hive.settings where key='emergency_stop'), 'false');" \
        || echo "base: no se pudo leer (permisos o red)"
    else
      echo "base: sin URL (exporta HIVE_WORKER_DATABASE_URL para comprobarla)"
    fi
    ;;
  *)
    echo "uso: $0 {on|off|status}" >&2
    exit 2
    ;;
esac
