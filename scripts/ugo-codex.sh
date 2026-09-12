#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
EXPECTED_REMOTE="github.com/sebastisnzoth/ugo-admin-panel"

if [[ -z "$ROOT" ]]; then
  echo "No estás dentro de un repositorio Git."
  exit 1
fi

cd "$ROOT"

REMOTE="$(git remote get-url origin 2>/dev/null || true)"
if [[ "$REMOTE" != *"$EXPECTED_REMOTE"* ]]; then
  echo "Este comando debe ejecutarse en sebastisnzoth/ugo-admin-panel."
  echo "origin actual: ${REMOTE:-sin origin}"
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "No encuentro el comando 'codex' en PATH."
  exit 1
fi

BRANCH="$(git branch --show-current)"
if [[ "$BRANCH" != "main" ]]; then
  echo "Aviso: estás en '$BRANCH'. AGENTS.md define main como verdad integrada."
fi

PROMPT='Trabajá en UGO según AGENTS.md, CODEX.md y docs/UGO_AGENT_HANDOFF.md. Verificá primero el estado real de main. Tomá el CURRENT P0 o el siguiente P0/P1 con dependencia satisfecha, preguntate “¿Qué impide hoy que esto tenga su primer cliente real?”, resolvé de forma autónoma, ejecutá los gates reales, corregí y revalidá. Actualizá docs/UGO_AGENT_HANDOFF.md y UGO_ROADMAP_MASTER.md sólo cuando cambie el estado real. No uses producción como entorno destructivo, no uses UGO Arena, no crees infraestructura paga y no me preguntes salvo decisión crítica según AGENTS.md. Al terminar reportá IMPLEMENTED, VALIDATED, RELEASED, BLOCKED, NEXT y COMMITS.'

printf '\nUGO → Codex\nRepo: %s\nBranch: %s\n\n' "$REMOTE" "$BRANCH"

exec codex "$PROMPT"
